describe("chorus.pages.HdfsShowFilePage", function() {
    beforeEach(function() {
        this.hadoopInstance = rspecFixtures.hadoopInstance({id: 1234, name: "MyInstance"});
        this.file = fixtures.hdfsFile({
            id: 789,
            path: "/my/path/my file.txt",
            name: "my file.txt",
            ancestors: [{id: 10, name: "path"}, {id: 11, name: "my"}, {id: 12, name: "MyInstance"}],
            contents: ["first line", "second line"]
        });
        this.page = new chorus.pages.HdfsShowFilePage("1234", "789");
    });

    it("has a helpId", function() {
        expect(this.page.helpId).toBe("hadoop_instances")
    });

    it("constructs an HDFS file model with the right instance id", function() {
        expect(this.page.model).toBeA(chorus.models.HdfsEntry);
        expect(this.page.model.get("hadoopInstance").id).toBe("1234");
    });

    describe("before fetches complete", function() {
        beforeEach(function() {
            this.page.render();
        });

        it("shows some breadcrumbs", function() {
            expect(this.page.$(".breadcrumb:eq(0) a").attr("href")).toBe("#/");
            expect(this.page.$(".breadcrumb:eq(0)").text().trim()).toMatchTranslation("breadcrumbs.home");

            expect(this.page.$(".breadcrumb:eq(1) a").attr("href")).toBe("#/instances");
            expect(this.page.$(".breadcrumb:eq(1)").text().trim()).toMatchTranslation("breadcrumbs.instances");
        });
    });

    context("fetches complete", function() {
        beforeEach(function() {
            this.server.completeFetchFor(this.page.hadoopInstance, this.hadoopInstance);
            this.server.completeFetchFor(this.page.model, this.file);
        });

        it("has the breadcrumbs", function() {
            expect(this.page.model.loaded).toBeTruthy();
            expect(this.page.$(".breadcrumbs .spacer").length).toBe(3);

            expect(this.page.$(".breadcrumb:eq(0) a").attr("href")).toBe("#/");
            expect(this.page.$(".breadcrumb:eq(0)").text().trim()).toMatchTranslation("breadcrumbs.home");

            expect(this.page.$(".breadcrumb:eq(1) a").attr("href")).toBe("#/instances");
            expect(this.page.$(".breadcrumb:eq(1)").text().trim()).toMatchTranslation("breadcrumbs.instances");

            expect(this.page.$(".breadcrumb:eq(2)").text().trim()).toBe("MyInstance (2)");

            expect(this.page.$(".breadcrumb:eq(3)").text().trim()).toBe("my file.txt");
        });

        it("has the file is read-only indicator", function() {
            expect(this.page.$(".content_details .plain_text")).toContainTranslation("hdfs.read_only")
        });

        it("has the correct sidebar", function() {
            expect(this.page.sidebar).toBeA(chorus.views.HdfsShowFileSidebar);
        });

        it("has a header file", function() {
            expect(this.page.mainContent.contentHeader).toBeA(chorus.views.HdfsShowFileHeader);
            expect(this.page.mainContent.contentHeader.model.get('contents').length).toBe(2);
        })

        it("shows the hdfs file", function() {
            expect(this.page.mainContent.content).toBeA(chorus.views.HdfsShowFileView);
            expect(this.page.mainContent.content.model.get('content')).toBe(this.file.get('content'));
            expect(this.page.mainContent.content.model.get('path')).toBe(this.file.get('path'));            
            expect(this.page.mainContent.content.model.get('contents').length).toBe(2);
        })
    });

    describe("when the path is long", function() {
        beforeEach(function() {
            spyOn(chorus, "menu");

            this.server.completeFetchFor(this.page.model,
                {
                    path: "/start/m1/m2/m3/end",
                    ancestors: [{id: 11, name: "end"},
                        {id: 22, name: "m3"},
                        {id: 33, name: "m2"},
                        {id: 44, name: "m1"},
                        {id: 55, name: "start"}
                    ],
                    name: "foo.csv",
                    contents: ["hello"]
                }
            );

            this.server.completeFetchFor(this.page.hadoopInstance, this.hadoopInstance);
        });

        it("constructs the breadcrumb links correctly", function () {
            var options = chorus.menu.mostRecentCall.args[1];

            var $content = $(options.content);

            expect($content.find("a").length).toBe(5);

            expect($content.find("a").eq(0).attr("href")).toBe("#/hadoop_instances/1234/browse/55");
            expect($content.find("a").eq(1).attr("href")).toBe("#/hadoop_instances/1234/browse/44");
            expect($content.find("a").eq(2).attr("href")).toBe("#/hadoop_instances/1234/browse/33");
            expect($content.find("a").eq(3).attr("href")).toBe("#/hadoop_instances/1234/browse/22");
            expect($content.find("a").eq(4).attr("href")).toBe("#/hadoop_instances/1234/browse/11");

            expect($content.find("a").eq(0).text()).toBe("start");
            expect($content.find("a").eq(1).text()).toBe("m1");
            expect($content.find("a").eq(2).text()).toBe("m2");
            expect($content.find("a").eq(3).text()).toBe("m3");
            expect($content.find("a").eq(4).text()).toBe("end");
        });
    })
});
