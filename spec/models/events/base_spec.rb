require "spec_helper"

describe Events::Base do
  describe ".add(params)" do
    it "creates an event with the given parameters" do
      gpdb_instance1 = gpdb_instances(:shared)
      gpdb_instance2 = gpdb_instances(:owners)
      user1 = users(:owner)
      user2 = FactoryGirl.create(:user)
      user3 = FactoryGirl.create(:user)
      dataset = datasets(:table)
      hdfs_entry = HdfsEntry.create({:hadoop_instance_id => 1234, :path => "/path/file.txt"})
      workspace = workspaces(:public)

      Events::GreenplumInstanceCreated.by(user1).add(:greenplum_instance => gpdb_instance1)
      Events::GreenplumInstanceChangedOwner.by(user2).add(:greenplum_instance => gpdb_instance2, :new_owner => user3)
      Events::WorkspaceAddHdfsAsExtTable.by(user1).add(:dataset => dataset, :hdfs_file => hdfs_entry, :workspace => workspace)

      event1 = Events::GreenplumInstanceCreated.last
      event2 = Events::GreenplumInstanceChangedOwner.last
      event3 = Events::WorkspaceAddHdfsAsExtTable.last

      event1.actor.should == user1
      event1.greenplum_instance.should == gpdb_instance1

      event2.actor.should == user2
      event2.greenplum_instance.should == gpdb_instance2
      event2.new_owner.should == user3

      event3.workspace.should == workspace
    end
  end

  it_should_behave_like "recent"

  describe '.notification_for_current_user' do
    let(:event) { event_owner.notifications.last.event }
    let(:event_owner) { users(:owner) }

    it "retrieves the notification for the event" do
      stub(ActiveRecord::Base).current_user { event_owner }
      event.notification_for_current_user.should be_present
    end

    it "does not retrieve the notification for a user for whom there is none" do
      stub(ActiveRecord::Base).current_user { users(:no_collaborators) }
      event.notification_for_current_user.should be_nil
    end
  end

  describe ".visible_to(user)" do
    let(:user) { users(:no_collaborators) }
    let(:the_events) do
      [
        events(:no_collaborators_creates_private_workfile),
        events(:private_workfile_created),
        events(:public_workfile_created),
        events(:no_collaborators_creates_private_workfile)
      ]
    end

    let(:other_workspace1) { workspaces(:public) }
    let(:other_workspace2) { workspaces(:private) }
    let(:user_workspace) { workspaces(:public_with_no_collaborators) }

    let!(:workspace_activity) { Activity.create!(:entity => user_workspace, :event => the_events[0] ) }

    let!(:other_workspace1_activity) { Activity.create!(:entity => other_workspace1, :event => the_events[1]) }
    let!(:other_workspace2_activity) { Activity.create!(:entity => other_workspace2, :event => the_events[2]) }

    let!(:global_activity) { Activity.global.create!(:event => the_events[3]) }
    let!(:duplicate_global_activity) { Activity.global.create!(:event => the_events[0]) }

    subject { Events::Base.visible_to(user) }

    it "includes global events" do
      subject.should include(global_activity.event)
    end

    it "includes events for the user's workspaces" do
      subject.should include(workspace_activity.event)
    end

    it "does not include events for other public workspaces" do
      subject.should_not include(other_workspace2_activity.event)
    end

    it "does not include other's private workspaces" do
      subject.should_not include(other_workspace1_activity.event)
    end

    it "does not include multiples of the same event" do
      ids = subject.map(&:id)
      ids.should == ids.uniq
    end

    it "can be filtered further (like any activerecord relation)" do
      event = global_activity.event
      subject.find(event.to_param).should == event
      subject.find_by_id(other_workspace1_activity.event).should be_nil
    end
  end

  it "destroys all of its associated activities when it is destroyed" do
    event = Events::SourceTableCreated.last
    Activity.where(:event_id => event.id).size.should > 0
    event.destroy
    Activity.where(:event_id => event.id).size.should == 0
  end

  describe "with deleted" do
    describe "workspace" do
      it "still has access to the workspace" do
        workspace = Workspace.last
        event = Events::Base.create!(:workspace => workspace)
        workspace.destroy
        event.reload.workspace.should == workspace
      end
    end

    describe "actor" do
      it "still has access to the actor" do
        actor = users(:not_a_member)
        event = Events::Base.create!(:actor => actor)
        actor.destroy
        event.reload.actor.should == actor
      end
    end

    describe "targets" do
      it "still has access to the targets" do
        event = Events::Base.where("target1_id IS NOT NULL AND target2_id IS NOT NULL").last
        target1 = event.target1
        target2 = event.target2
        target1.destroy
        target2.destroy
        event.reload
        event.target1.should == target1
        event.target2.should == target2
      end
    end
  end
end
