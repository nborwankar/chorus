class Import < ActiveRecord::Base
  belongs_to :workspace
  belongs_to :source_dataset, :class_name => 'Dataset'
  belongs_to :user
  belongs_to :import_schedule

  def self.run(import_id)
    Import.find(import_id).run
  end

  def run
    import_attributes = attributes.symbolize_keys
    import_attributes.slice!(:workspace_id, :to_table, :new_table, :sample_count, :truncate, :dataset_import_created_event_id)

    if workspace.sandbox.database != source_dataset.schema.database
      Gppipe.run_import(source_dataset.id, user.id, import_attributes)
    else
      GpTableCopier.run_import(source_dataset.id, user.id, import_attributes)
    end
    import_schedule.update_attribute(:new_table, false) if new_table? && import_schedule
  end

  def target_dataset_id
    if dataset_import_created_event_id
      event = Events::DatasetImportCreated.find(dataset_import_created_event_id)
      event.target2_id if event
    end
  end
end