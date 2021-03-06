module Visualization
  class HistogramPresenter < Presenter
    include DbTypesToChorus

    delegate :rows, :bins, :category, :filters, :type, :to => :model

    def to_hash
      {
          :type => type,
          :bins => bins,
          :x_axis => category,
          :filters => filters,
          :rows => rows,
          :columns => [{name: "bin", type_category: "STRING"}, {name: "frequency", type_category: "WHOLE_NUMBER"}]
      }
    end
  end
end