describe("chorus.models.Sandbox", function() {
    beforeEach(function() {
        this.model = rspecFixtures.workspace().sandbox();
    });

    describe("#url", function() {
        context("when creating", function() {
            it("has the right url", function() {
                var uri = new URI(this.model.url({ method: "create" }));
                expect(uri.path()).toBe("/workspace/" + this.model.get('workspaceId') + "/sandbox");
            });
        });
    });

    describe("#schema", function() {
        beforeEach(function() {
            this.schema = this.model.schema();
        });

        it("should be created with instance, database, and schema names and ids", function() {
            expect(this.schema.get('id')).toBe(this.model.get('id'));
            expect(this.schema.get('name')).toBe(this.model.get('name'));
        });

        it("should memoize the schema", function() {
            expect(this.schema).toBe(this.model.schema());
        })
    });

    describe("#database", function() {
        beforeEach(function() {
            this.database = this.model.database();
        });

        it("returns a database with the right id and instanceId", function() {
            expect(this.database).toBeA(chorus.models.Database);
            expect(this.database.get("id")).toBe(this.model.get("database").id);
            expect(this.database.get("name")).toBe(this.model.get("database").name);
        });

        it("memoizes", function() {
            expect(this.database).toBe(this.model.database());
        });
    });

    describe("#instance", function() {
        beforeEach(function() {
            this.instance = this.model.instance();
        });

        it("returns an instance with the right id and name", function() {
            expect(this.instance).toBeA(chorus.models.GreenplumInstance);
            expect(this.instance.get("id")).toBe(this.model.get("database").instance.id);
            expect(this.instance.get("name")).toBe(this.model.get("database").instance.name);
        });

        it("memoizes", function() {
            expect(this.instance).toBe(this.model.instance());
        });
    });

    describe("#beforeSave", function() {
        it("sets the 'type' field as required by the api", function() {
            this.model.save({ instance: '22', database: '11', schema: '33' });
            expect(this.model.get("type")).toBe("000");

            this.model.clear();
            this.model.save({ instance: '22', database: '11', schemaName: "baz" });
            expect(this.model.get("type")).toBe("001");

            this.model.clear();
            this.model.save({ instance: '22', databaseName: "foobar", schemaName: "meow" });
            expect(this.model.get("type")).toBe("011");
        });
    });

    describe("validations", function() {
        beforeEach(function() {
            this.model.set({
                instance: '1',
                database: '2',
                schema: '3'
            });
            expectValid({}, this.model);
        });

        context("without an instance id", function() {
            beforeEach(function() {
                this.model.set({ instanceName: "my_instance", size: "45" });
                this.model.unset("instance")
                expectValid({}, this.model);
            });

            it("requires an instance name", function() {
                this.model.unset("instanceName")
                expectInvalid({}, this.model, [ "instanceName" ]);
                expect(this.model.errors["instanceName"]).toMatchTranslation("validation.required", { fieldName : this.model._textForAttr("instanceName") })
            })

            it("requires an instance name that starts with an alphabetic character", function() {
                expectInvalid({ instanceName: "_asdf" }, this.model, [ "instanceName" ]);
            });

            it("requires an instance name that is less than 44 characters", function() {
                this.model.unset("instance")
                expectInvalid({instanceName: _.repeat("a", 45)}, this.model, ["instanceName"]);
            });

            it("requires an database name that is less than 63 characters", function() {
                this.model.unset("database")
                expectInvalid({databaseName: _.repeat("a", 64)}, this.model, ["databaseName"]);
            });

            it("requires an schema name that is less than 63 characters", function() {
                this.model.unset("schema")
                expectInvalid({schemaName: _.repeat("a", 64)}, this.model, ["schemaName"]);
            });

            it("requires size", function() {
                this.model.unset("size")
                expectInvalid({ }, this.model, [ "size" ]);
                expect(this.model.errors["size"]).toMatchTranslation("validation.required", { fieldName : this.model._textForAttr("size") })
            })

            it("requires a positive integer for the instance size", function() {
                expectInvalid({ size: "foo" }, this.model, [ "size" ]);
                expectInvalid({ size: "-1" }, this.model, [ "size" ]);
                expectInvalid({ size: "0" }, this.model, [ "size" ]);
                expectInvalid({ size: "1.7" }, this.model, [ "size" ]);
            });

            context("if it's an aurora instance", function() {
                beforeEach(function() {
                    this.model.set({ type: "111" });
                });

                it("requires a db username and db password", function() {
                    expectInvalid({ }, this.model, [ "dbUsername", "dbPassword" ]);
                });
            });

            describe("when the maximum size has been configured", function() {
                beforeEach(function() {
                    this.model.maximumSize = 2000;
                })

                it("requires a size less than or equal to the maximum size", function() {
                    expectInvalid({ size: "3000" }, this.model, [ "size" ]);
                    expectValid({ size: "2000" }, this.model);
                    expectValid({ size: "200" }, this.model);
                })
            })
        });

        context("with a database id", function() {
            beforeEach(function() {
                this.model.unset('databaseId');
            });
            context("without a schema", function() {
                beforeEach(function() {
                    this.model.unset("schema");
                    this.model.unset("schemaName");
                });

                it("requires a schema name", function() {
                    expectInvalid({ }, this.model, [ "schemaName" ]);
                    expect(this.model.errors["schemaName"]).toMatchTranslation("validation.required", { fieldName : this.model._textForAttr("schemaName") })
                });

                it("requires that the schema name not start with a number", function() {
                    expectInvalid({ schemaName: "3friends_of_the_forest" }, this.model, [ "schemaName" ]);
                    expectValid({ schemaName: "friends_of_the_forest" }, this.model);
                });

                it("requires that the schema name does NOT contain whitespace", function() {
                    expectInvalid({ schemaName: "friends of the forest" }, this.model, [ "schemaName" ]);
                });
            });
        });

        context("without a database id", function() {
            beforeEach(function() {
                this.model.set({ databaseName: "bernards_db", schemaName: "cool_schema" });
                this.model.unset("database");
                expectValid({}, this.model);
            });

            it("requires a database name", function() {
                this.model.unset("databaseName")
                expectInvalid({ }, this.model, [ "databaseName" ]);
                expect(this.model.errors["databaseName"]).toMatchTranslation("validation.required", { fieldName : this.model._textForAttr("databaseName") })
            });

            it("requires that the database name not start with a number", function() {
                expectInvalid({ databaseName: "3friends_of_the_forest" }, this.model, [ "databaseName" ]);
            });

            it("requires that the database name does NOT contain whitespace", function() {
                expectInvalid({ databaseName: "friends of the forest" }, this.model, [ "databaseName" ]);
            });

            it("requires a schema name", function() {
                this.model.unset("schemaName")
                expectInvalid({ }, this.model, [ "schemaName" ]);
                expect(this.model.errors["schemaName"]).toMatchTranslation("validation.required", { fieldName : this.model._textForAttr("schemaName") })
            });

            context("when a schema name is specified", function() {
                it("requires that the name not start with a number", function() {
                    expectInvalid({ schemaName: "3friends_of_the_forest" }, this.model, [ "schemaName" ]);
                });

                it("requires that the name does NOT contain whitespace", function() {
                    expectInvalid({ schemaName: "friends of the forest" }, this.model, [ "schemaName" ]);
                });
            });
        });
    });

    function expectValid(attrs, model) {
        model.performValidation(attrs);
        expect(model.isValid()).toBeTruthy();
    }

    function expectInvalid(attrs, model, invalid_attrs) {
        invalid_attrs || (invalid_attrs = [])
        model.performValidation(attrs);
        expect(model.isValid()).toBeFalsy();
        _.each(invalid_attrs, function(invalid_attr) {
            expect(model.errors)
        })
    }
});
