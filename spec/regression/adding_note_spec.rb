require File.join(File.dirname(__FILE__), '../integration/spec_helper.rb')

describe "creating a note on a hadoop instance" do
  it "contains the new note" do
    login('edcadmin', 'secret')
    new_instance_name = "HD_inst_sel_test#{Time.now.to_i}"
    create_valid_hadoop_instance(:name => new_instance_name)
    wait_until { page.has_selector?('a[data-dialog="NotesNew"]') }
    sleep(1)
    click_link "Add a note"

    within_modal do
      set_cleditor_value("body", "Note on the hadoop instance")
      click_submit_button
      wait_for_ajax
    end

    page.should have_content("Note on the hadoop instance")
  end
end

describe "creating a note on the hadoop file" do

it "contains the new note" do
  login('edcadmin', 'secret')
  new_instance_name = "Hadoop_file"
  create_valid_hadoop_instance(:name => new_instance_name)
  click_link new_instance_name
  click_link "test.csv"
  wait_until { page.has_selector?('a[data-dialog="NotesNew"]') }
  sleep(1)
  click_link "Add a note"

  within_modal do
    set_cleditor_value("body", "Note on the hadoop file")
    click_submit_button
    wait_for_ajax
  end

  page.should have_content("Note on the hadoop file")
end
end