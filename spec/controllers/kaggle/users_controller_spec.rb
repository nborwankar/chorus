require 'spec_helper'

describe Kaggle::UsersController do
  let(:user) { users(:owner) }

  before do
    log_in user
  end

  describe "#index" do
    it_behaves_like "an action that requires authentication", :get, :index

    it "succeeds" do
      get :index
      response.code.should == "200"
    end

    it "shows list of users" do
      get :index
      decoded_response.length.should > 0
    end

    it "shows attributes for the users" do
      get :index
      user = decoded_response.first
      user.should have_key('username')
      user.should have_key('location')
      user.should have_key('rank')
      user.should have_key('number_of_competitions')
      user.should have_key('gravatar_url')
      user.should have_key('full_name')
    end

    it "sorts by rank" do
      get :index
      decoded_response.first.rank.should <= decoded_response.second.rank
    end

    generate_fixture "kaggleUserSet.json" do
      get :index
    end
  end
end