require 'events/base'

module Events
  class GnipStreamImportFailed < Base
    has_targets :gnip_instance, :dataset, :workspace
    has_activities :workspace, :dataset, :gnip_instance, :global
    has_additional_data :error_message
  end
end