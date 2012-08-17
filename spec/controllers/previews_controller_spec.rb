require 'spec_helper'

describe PreviewsController do
  ignore_authorization!

  let(:gpdb_table) { datasets(:bobs_table) }
  let(:instance) { gpdb_table.instance }
  let(:user) { users(:carly) }
  let(:account) { instance.account_for_user!(user) }

  before do
    log_in user
  end

  describe "#create" do
    context "when create is successful" do
      before do
        fake_result = SqlResult.new
        mock(SqlExecutor).preview_dataset(gpdb_table, account, '0.43214321') { fake_result }
      end

      it "uses authentication" do
        mock(subject).authorize! :show_contents, gpdb_table.instance
        post :create, :dataset_id => gpdb_table.to_param, :task => {:check_id => '0.43214321'}
      end

      it "reports that the preview was created" do
        post :create, :dataset_id => gpdb_table.to_param, :task => {:check_id => '0.43214321'}
        response.code.should == "201"
      end

      it "renders the preview" do
        post :create, :dataset_id => gpdb_table.to_param, :task => {:check_id => '0.43214321'}
        decoded_response.columns.should_not be_nil
        decoded_response.rows.should_not be_nil
      end

      generate_fixture "dataPreviewTaskResults.json" do
        post :create, :dataset_id => gpdb_table.to_param, :task => {:check_id => "0.43214321"}
        response.should be_success
      end
    end

    context "when there's an error'" do
      before do
        mock(SqlExecutor).preview_dataset(gpdb_table, account, '0.43214321') { raise CancelableQuery::QueryError }
      end
      it "returns an error if the query fails" do
        post :create, :dataset_id => gpdb_table.to_param, :task => {:check_id => '0.43214321'}

        response.code.should == "422"
        decoded_errors.fields.query.INVALID.message.should_not be_nil
      end
    end
  end

  describe "#destroy" do
    it "cancels the data preview command" do
      mock(SqlExecutor).cancel_query(gpdb_table, account, '0.12341234')
      delete :destroy, :dataset_id => gpdb_table.to_param, :id => '0.12341234'

      response.code.should == '200'
    end
  end
end
