require 'tempfile'
require 'spec_helper'

describe CsvImporter, :database_integration => true do
  describe "actually performing the import" do

    before do
      refresh_chorus
      any_instance_of(CsvImporter) { |importer| stub(importer).destination_dataset { datasets(:bobs_table) } }
    end

    let(:schema) { GpdbSchema.find_by_name('test_schema') }
    let(:user) { account.owner }
    let(:account) { real_gpdb_account }
    let(:workspace) { Workspace.create({:sandbox => schema, :owner => user, :name => "TestCsvWorkspace"}, :without_protection => true) }

    it "imports a basic csv file as a new table" do
      f = Tempfile.new("test_csv")
      f.puts "1,foo\n2,bar\n3,baz\n"
      f.close
      csv_file = CsvFile.new(:contents => f,
                             :column_names => [:id, :name],
                             :types => [:integer, :varchar],
                             :delimiter => ',',
                             :header => true,
                             :to_table => "new_table_from_csv")
      csv_file.user = user
      csv_file.workspace = workspace
      csv_file.save!

      CsvImporter.import_file(csv_file.id)

      schema.with_gpdb_connection(account) do |connection|
        result = connection.exec_query("select * from new_table_from_csv order by ID asc;")
        result[0].should == {"id" => 1, "name" => "foo"}
        result[1].should == {"id" => 2, "name" => "bar"}
        result[2].should == {"id" => 3, "name" => "baz"}
      end
    end

    it "imports a file with different column names, header rows and a different delimiter" do
      f = Tempfile.new("test_csv")
      f.puts "ignore\tme\n1\tfoo\n2\tbar\n3\tbaz\n"
      f.close

      csv_file = CsvFile.create(:contents => f,
                                :column_names => [:id, :dog],
                                :types => [:integer, :varchar],
                                :delimiter => "\t",
                                :header => false,
                                :to_table => "another_new_table_from_csv")
      csv_file.user = user
      csv_file.workspace = workspace
      csv_file.save!

      CsvImporter.import_file(csv_file.id)


      schema.with_gpdb_connection(account) do |connection|
        result = connection.exec_query("select * from another_new_table_from_csv order by ID asc;")
        result[0].should == {"id" => 1, "dog" => "foo"}
        result[1].should == {"id" => 2, "dog" => "bar"}
        result[2].should == {"id" => 3, "dog" => "baz"}
      end
    end
  end

  describe "without connecting to GPDB" do
    let(:csv_file) { CsvFile.first }
    let(:user) { csv_file.user }
    let(:dataset) { datasets(:bobs_table) }
    let(:instance_account) { csv_file.workspace.sandbox.instance.account_for_user!(csv_file.user) }

    describe "destination_dataset" do
      before do
        mock(Dataset).refresh(instance_account, csv_file.workspace.sandbox)
      end

      it "performs a refresh and returns the dataset matching the import table name" do
        importer = CsvImporter.new(csv_file.id)
        importer.destination_dataset.name.should == csv_file.to_table
      end
    end

    describe "when the import is successful" do
      before do
        any_instance_of(GpdbSchema) { |schema| stub(schema).with_gpdb_connection }
        any_instance_of(CsvImporter) { |importer| stub(importer).destination_dataset { dataset } }
        CsvImporter.import_file(csv_file.id)
      end

      it "makes a IMPORT_SUCCESS event" do
        event = Events::IMPORT_SUCCESS.first
        event.actor.should == user
        event.dataset.should == dataset
        event.workspace.should == csv_file.workspace
        event.file_name.should == csv_file.contents_file_name
        event.import_type.should == 'file'
      end
    end

    describe "when the import fails" do
      before do
        @error = 'ActiveRecord::JDBCError: ERROR: relation "test" already exists: CREATE TABLE test(a float, b float, c float);'
        exception = ActiveRecord::StatementInvalid.new(@error)
        any_instance_of(GpdbSchema) { |schema| stub(schema).with_gpdb_connection { raise exception } }
        CsvImporter.import_file(csv_file.id)
      end

      it "makes a IMPORT_FAILED event" do
        event = Events::IMPORT_FAILED.first
        event.actor.should == user
        event.destination_table.should == dataset.name
        event.workspace.should == csv_file.workspace
        event.file_name.should == csv_file.contents_file_name
        event.import_type.should == 'file'
        event.error_message.should == @error
      end
    end
  end
end