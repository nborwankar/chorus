class DatasetStatisticsPresenter < Presenter
  delegate :table_type, :table_name, :row_count, :column_count, :description, :last_analyzed,
           :disk_size, :partition_count, :definition, :to => :model

  def to_hash
    {
        :object_type => table_type,
        :rows => row_count,
        :columns => column_count,
        :description => description,
        :last_analyzed_time => last_analyzed,
        :on_disk_size => disk_size,
        :partitions => partition_count,
        :definition => definition
    }
  end

  def complete_json?
    true
  end
end