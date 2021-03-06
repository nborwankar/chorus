class Workspace < ActiveRecord::Base
  include SoftDelete
  attr_accessor :archived
  attr_accessible :name, :public, :summary, :sandbox_id, :member_ids, :has_added_member, :owner_id, :archiver, :archived, :has_changed_settings

  has_attached_file :image, :path => Chorus::Application.config.chorus['assets_storage_path'] + ":class/:id/:style/:basename.:extension",
                    :url => "/:class/:id/image?style=:style",
                    :default_url => "", :styles => {:icon => "50x50>"}

  belongs_to :archiver, :class_name => 'User'
  belongs_to :owner, :class_name => 'User'
  has_many :memberships, :inverse_of => :workspace
  has_many :members, :through => :memberships, :source => :user
  has_many :workfiles
  has_many :activities, :as => :entity
  has_many :events, :through => :activities
  has_many :owned_notes, :class_name => 'Events::Base', :conditions => "events.action ILIKE 'Events::Note%'"
  has_many :owned_events, :class_name => 'Events::Base'
  has_many :comments, :through => :owned_events
  belongs_to :sandbox, :class_name => 'GpdbSchema'

  has_many :csv_files

  has_many :associated_datasets
  has_many :bound_datasets, :through => :associated_datasets, :source => :dataset

  validates_presence_of :name
  validate :uniqueness_of_workspace_name
  validate :owner_is_member, :on => :update
  validate :archiver_is_set_when_archiving
  validates_attachment_size :image, :less_than => Chorus::Application.config.chorus['file_sizes_mb']['workspace_icon'].megabytes, :message => :file_size_exceeded

  before_update :clear_assigned_datasets_on_sandbox_assignment, :create_name_change_event
  before_save :update_has_added_sandbox
  after_create :add_owner_as_member

  scope :active, where(:archived_at => nil)

  attr_accessor :highlighted_attributes, :search_result_notes
  searchable do
    text :name, :stored => true, :boost => SOLR_PRIMARY_FIELD_BOOST
    text :summary, :stored => true, :boost => SOLR_SECONDARY_FIELD_BOOST
    string :grouping_id
    string :type_name
    string :security_type_name
  end

  def solr_reindex
    solr_index
    workfiles(:reload => true).each(&:solr_index)
  end

  has_shared_search_fields [
    { :type => :integer, :name => :member_ids, :options => { :multiple => true } },
    { :type => :boolean, :name => :public },
    { :type => :integer, :name => :workspace_id, :options => { :multiple => true, :using => :id} }
  ]

  def self.add_search_permissions(current_user, search)
    unless current_user.admin?
      search.build do
        any_of do
          without :security_type_name, Workspace.security_type_name
          with :member_ids, current_user.id
          with :public, true
        end
      end
    end
  end

  def uniqueness_of_workspace_name
    if self.name
      other_workspace = Workspace.where("lower(name) = ?", self.name.downcase)
      other_workspace = other_workspace.where("id != ?", self.id) if self.id
      if other_workspace.present?
        errors.add(:name, :taken)
      end
    end
  end

  def datasets(current_user, type = nil)
    if sandbox
      account = sandbox.database.account_for_user(current_user)

      if account
        viewable_table_ids = Dataset.visible_to(account, sandbox).map(&:id)
        datasets = Dataset.where(:id => viewable_table_ids)
      else
        viewable_table_ids = []
        datasets = Dataset.where(:id => [])
      end

      case type
        when "SANDBOX_TABLE" then
          datasets = datasets.tables
        when "SANDBOX_DATASET" then
          datasets = datasets.where(:schema_id => sandbox.id)
        when "CHORUS_VIEW" then
          associated_dataset_ids = associated_datasets.pluck(:dataset_id)
          datasets = Dataset.where(:type => "ChorusView").where(:id => associated_dataset_ids)
        when "SOURCE_TABLE" then
          associated_dataset_ids = associated_datasets.pluck(:dataset_id)
          datasets = Dataset.where("schema_id != ?", sandbox.id).where(:id => associated_dataset_ids).where("type != 'ChorusView'")
        else
          datasets = Dataset.where(:id => (bound_dataset_ids + viewable_table_ids))
      end
      return datasets
    else
      bound_datasets
    end
  end

  def self.workspaces_for(user)
    if user.admin?
      scoped
    else
      accessible_to(user)
    end
  end

  def self.accessible_to(user)
    with_membership = user.memberships.pluck(:workspace_id)
    where('workspaces.public OR
          workspaces.id IN (:with_membership) OR
          workspaces.owner_id = :user_id',
          :with_membership => with_membership,
          :user_id => user.id
         )
  end

  def members_accessible_to(user)
    if public? || members.include?(user)
      members
    else
      []
    end
  end

  def permissions_for(user)
    if user.admin? || (owner.id == user.id)
      [:admin]
    elsif user.memberships.find_by_workspace_id(id)
      [:read, :commenting, :update]
    elsif public?
      [:read, :commenting]
    else
      []
    end
  end

  def archived?
    archived_at?
  end

  def has_dataset?(dataset)
    dataset.schema == sandbox || bound_datasets.include?(dataset)
  end

  def member?(user)
    members.include?(user)
  end

  def archived=(value)
    if value == 'true'
      self.archived_at = Time.current
    elsif value == 'false'
      self.archived_at = nil
      self.archiver = nil
    end
  end

  def archiver=(value)
    if value.nil? || (value.is_a? User)
      super
    end
  end

  private

  def owner_is_member
    unless members.include? owner
      errors.add(:owner, "Owner must be a member")
    end
  end

  def add_owner_as_member
    unless members.include? owner
      memberships.create!({ :user => owner, :workspace => self }, { :without_protection => true })
    end
  end

  def archiver_is_set_when_archiving
    if archived? && !archiver
      errors.add(:archived, "Archiver is required for archiving")
    end
  end

  def update_has_added_sandbox
    self.has_added_sandbox = true if sandbox_id_changed? && sandbox
    true
  end
  def create_name_change_event
    create_workspace_name_change_event if name_changed?
  end

  def clear_assigned_datasets_on_sandbox_assignment
    return true unless sandbox_id_changed? && sandbox
    bound_datasets.each do |dataset|
      bound_datasets.destroy(dataset) if sandbox.datasets.include? dataset
    end
    true
  end

  def create_workspace_name_change_event
    Events::WorkspaceChangeName.by(ActiveRecord::Base.current_user).add(:workspace => self, :workspace_old_name => self.name_was)
  end
end
