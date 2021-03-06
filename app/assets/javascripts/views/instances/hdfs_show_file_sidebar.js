chorus.views.HdfsShowFileSidebar = chorus.views.Sidebar.extend({
    templateName: "hdfs_show_file_sidebar",
    constructorName: "HdfsShowFileSidebar",

    events: {
        "click a.external_table": "createExternalTable"
    },

    subviews:{
        '.tab_control': 'tabs'
    },

    setup: function() {
        this.tabs = new chorus.views.TabControl(["activity"])
        this.tabs.activity && this.tabs.activity.collection.fetch();

        var activities = this.model.activities();
        activities.fetch();

        this.bindings.add(activities, "changed", this.render);
        this.bindings.add(activities, "reset", this.render);

        this.tabs.activity = new chorus.views.ActivityList({
            collection: activities,
            additionalClass: "sidebar",
            type: t("hdfs.file")
        });

        chorus.PageEvents.subscribe("csv_import:started", function() {activities.fetch()}, this)
    },

    additionalContext: function() {
        return {
            fileName: this.model.get("name"),
            entityId: this.model.id,
            lastUpdated: t("hdfs.last_updated", { when: chorus.helpers.relativeTimestamp(this.model.get('lastUpdatedStamp')) })
        }
    },


    createExternalTable: function(e) {
        e && e.preventDefault();

        var csvOptions = {
            tableName: this.model.get("name"),
            contents: this.model.get('contents')
        }
        
        var hdfsExternalTable = new chorus.models.HdfsExternalTable({
            hdfs_entry_id: this.model.get('id')
        });

        var dialog = new chorus.dialogs.CreateExternalTableFromHdfs({model: hdfsExternalTable, csvOptions: csvOptions});
        dialog.launchModal();
    }
})
