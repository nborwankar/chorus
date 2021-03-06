class WorkspacePresenter < Presenter
  delegate :id, :name, :summary, :owner, :archiver, :archived_at, :public, :image, :sandbox, :permissions_for, :has_added_member,
           :has_added_workfile, :has_added_sandbox, :has_changed_settings, to: :model

  def to_hash
    if rendering_activities?
      {
          :id => id,
          :name => h(name)
      }
    else
      {
          :id => id,
          :name => h(name),
          :summary => sanitize(summary),
          :owner => present(owner),
          :archiver => present(archiver),
          :archived_at => archived_at,
          :public => public,
          :image => present(image),
          :permission => permissions_for(current_user),
          :has_added_member => has_added_member,
          :has_added_workfile => has_added_workfile,
          :has_added_sandbox => has_added_sandbox,
          :has_changed_settings => has_changed_settings,
          :sandbox_info => present(sandbox)
      }.merge(latest_comments_hash)
    end
  end

  def complete_json?
    !rendering_activities?
  end

  private

  def latest_comments_hash
    return {} unless @options[:show_latest_comments]
    recent_notes = model.owned_notes.recent
    recent_comments = model.comments.recent

    recent_insights = recent_notes.where(:insight => true)

    recent_notes_and_comments = recent_notes.order("updated_at desc").limit(5) + recent_comments.order("updated_at desc").limit(5)

    latest_5 = recent_notes_and_comments.sort_by(&:updated_at).last(5)

    {
        :number_of_insights => recent_insights.size,
        :number_of_comments => recent_notes.size + recent_comments.size - recent_insights.size,
        :latest_comment_list => present(latest_5)
    }
  end
end
