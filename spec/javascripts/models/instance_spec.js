describe("chorus.models.Instance", function() {
    beforeEach(function() {
        this.instance = newFixtures.instance.greenplum({id: 1});
    });

    describe("showUrl", function() {
        it("links to the database index page", function() {
            expect(this.instance.showUrl()).toBe("#/instances/1/databases");
        });

        context("for a hadoop instance", function() {
            beforeEach(function() {
                this.instance = newFixtures.instance.hadoop();
            });

            it("links to the root of the hadoop instance", function() {
                expect(this.instance.showUrl()).toBe("#/instances/" + this.instance.get('id') + "/browse/");
            })
        });
    });

    it("has a valid url", function() {
        expect(this.instance.url()).toBe("/instances/" + this.instance.get('id'));
    });

    describe("#stateIconUrl", function() {
        it("returns the right url for 'offline' instances", function() {
            this.instance.set({ state: "offline" });
            expect(this.instance.stateIconUrl()).toBe("/images/instances/red.png");
        });

        it("returns the right url for online instances", function() {
            this.instance.set({ state: "online" });
            expect(this.instance.stateIconUrl()).toBe("/images/instances/green.png");
        });

        it("returns the right url for other instances", function() {
            this.instance.set({ state: null });
            expect(this.instance.stateIconUrl()).toBe("/images/instances/unknown.png");
        });
    });

    describe("#providerIconUrl", function() {
        it("returns the right url for greenplum instances", function() {
            this.instance.set({ instance_provider: "Greenplum Database" });
            expect(this.instance.providerIconUrl()).toBe("/images/instances/greenplum_instance.png");
        });

        it("returns the right url for hadoop instances", function() {
            this.instance.set({ instance_provider: "Hadoop" });
            expect(this.instance.providerIconUrl()).toBe("/images/instances/hadoop_instance.png");
        });

        it("returns the right url for other instances", function() {
            this.instance.set({ instance_provider: "Something Else" });
            expect(this.instance.providerIconUrl()).toBe("/images/instances/other_instance.png");
        });
    });

    describe(".aurora", function() {
        beforeEach(function() {
            this.aurora = chorus.models.Instance.aurora();
        });

        it("returns a provisioning object", function() {
            expect(this.aurora).toBeA(chorus.models.Provisioning);
        });

        it("sets the 'provisionerPluginName' and 'type'", function() {
            expect(this.aurora.get("provisionerPluginName")).toBe("A4CProvisioner");
            expect(this.aurora.get("type")).toBe("install");
        });

        it("memoizes", function() {
            expect(this.aurora).toBe(chorus.models.Instance.aurora());
        });
    });

    describe(".auroraTemplates", function() {
        beforeEach(function() {
            this.templates = chorus.models.Instance.auroraTemplates();
        });

        it("returns a template set object", function() {
            expect(this.templates).toBeA(chorus.collections.ProvisioningTemplateSet);
        });

        it("memoizes", function() {
            expect(this.templates).toBe(chorus.models.Instance.auroraTemplates());
        });
    });

    describe("#owner", function() {
        it("returns a user", function() {
            var owner = this.instance.owner();
            expect(owner.get("id")).toBe(this.instance.get("owner").id);
            expect(owner.get("username")).toBe("edcadmin");
            expect(owner.displayName()).toBe("EDC Admin");
        })
    });

    describe("#isOwner", function() {
        it("returns true if object has same id", function() {
            var owner = this.instance.owner();
            var otherOwnerUser = newFixtures.user({id: owner.get('id')});
            expect(this.instance.isOwner(otherOwnerUser)).toBeTruthy();
        })
        it("returns false if id is different", function() {
            var otherOwnerUser = newFixtures.user({id: 'notanowner'});
            expect(this.instance.isOwner(otherOwnerUser)).toBeFalsy();
        })
        it("returns false if object is of different type", function() {
            var owner = this.instance.owner();
            var brokenParameter = newFixtures.instance.greenplum({id: owner.get('id')});
            expect(this.instance.isOwner(brokenParameter)).toBeFalsy();
        })
    });

    describe("#accountForUser", function() {
        beforeEach(function() {
            this.user = newFixtures.user();
            this.account = this.instance.accountForUser(this.user);
        });

        it("returns an InstanceAccount", function() {
            expect(this.account).toBeA(chorus.models.InstanceAccount);
        });

        it("sets the instance id", function() {
            expect(this.account.get("instance_id")).toBe(this.instance.get("id"));
        });

        it("sets the user id based on the given user", function() {
            expect(this.account.get("userId")).toBe(this.user.get("id"));
        });
    });

    describe("#accountForCurrentUser", function() {
        beforeEach(function() {
            this.currentUser = newFixtures.user();
            setLoggedInUser(this.currentUser.attributes);
        });

        it("memoizes", function() {
            var account = this.instance.accountForCurrentUser();
            expect(account).toBe(this.instance.accountForCurrentUser());
        });

        context("when the account is destroyed", function() {
            it("un-memoizes the account", function() {
                var previousAccount = this.instance.accountForCurrentUser();
                previousAccount.trigger("destroy");

                var account = this.instance.accountForCurrentUser();
                expect(account).not.toBe(previousAccount);
            });

            it("triggers 'change' on the instance", function() {
                spyOnEvent(this.instance, 'change');
                this.instance.accountForCurrentUser().trigger("destroy");
                expect("change").toHaveBeenTriggeredOn(this.instance);
            });
        });
    });

    describe("#accountForOwner", function() {
        beforeEach(function() {
            this.owner = this.instance.owner();
            this.account1 = newFixtures.instanceAccount();
            this.account2 = newFixtures.instanceAccount({
                owner: this.owner.attributes
            })
            this.accounts = fixtures.instanceAccountSet([this.account1, this.account2]);
            spyOn(this.instance, "accounts").andReturn(this.accounts);
        });

        it("returns the account for the owner", function() {
            expect(this.instance.accountForOwner()).toBeA(chorus.models.InstanceAccount);
            expect(this.instance.accountForOwner()).toBe(this.account2);
        });
    });

    describe("#accounts", function() {
        beforeEach(function() {
            this.instanceAccounts = this.instance.accounts();
        })

        it("returns an InstanceAccountSet", function() {
            expect(this.instanceAccounts).toBeA(chorus.collections.InstanceAccountSet)
        });

        it("sets the instance id", function() {
            expect(this.instanceAccounts.attributes.instance_id).toBe(this.instance.get('id'));
        });

        it("memoizes", function() {
            expect(this.instanceAccounts).toBe(this.instance.accounts());
        });
    });

    describe("#databases", function() {
        beforeEach(function() {
            this.databases = this.instance.databases();
        })

        it("returns an DatabaseSet", function() {
            expect(this.databases).toBeA(chorus.collections.DatabaseSet)
        });

        it("sets the instance id", function() {
            expect(this.databases.attributes.instance_id).toBe(this.instance.get('id'));
        });

        it("memoizes", function() {
            expect(this.databases).toBe(this.instance.databases());
        });
    });

    describe("#sharedAccount", function() {
        context("when the instance has a shared account", function() {
            beforeEach(function() {
                this.instance = newFixtures.instance.sharedAccount();
            });

            it("returns a instanceAccount based on the db_username of the instance", function() {
                var sharedAccount = this.instance.sharedAccount();
                expect(sharedAccount).toBeA(chorus.models.InstanceAccount);
                expect(sharedAccount.get('db_username')).toBe(this.instance.get('sharedAccount').db_username);
                expect(sharedAccount.get('instance_id')).toBe(this.instance.get('id'));
            });

            it("is a model in the same instance's #accounts collection'", function() {
                var account = this.instance.sharedAccount();
                expect(account.collection).toBe(this.instance.accounts());
                expect(this.instance.accounts().first()).toBe(account);
            });

            it("memoizes", function() {
                var sharedAccount = this.instance.sharedAccount();
                expect(sharedAccount).toBe(this.instance.sharedAccount());
            });
        });

        context("when the instance does not have a shared account", function() {
            it("returns undefined", function() {
                expect(this.instance.sharedAccount()).toBeUndefined();
            })
        });
    });

    describe("#usage", function() {
        beforeEach(function() {
            this.instanceUsage = this.instance.usage();
        })

        it("returns an InstanceUsage object", function() {
            expect(this.instanceUsage).toBeA(chorus.models.InstanceUsage);
        });

        it("sets the instance id", function() {
            expect(this.instanceUsage.attributes.instance_id).toBe(this.instance.get('id'));
        });

        it("memoizes", function() {
            expect(this.instanceUsage).toBe(this.instance.usage());
        });
    })

    describe("#isGreenplum", function() {
        var instance;
        beforeEach(function() {
            instance = newFixtures.instance.greenplum();
        });

        it("returns true for greenplum instances", function() {
            expect(instance.isGreenplum()).toBeTruthy();
        });

        it("returns false otherwise", function() {
            instance.set({instance_provider: "somethingElse"});
            expect(instance.isGreenplum()).toBeFalsy();
        });
    });

    describe("#isHadoop", function() {
        var instance;
        beforeEach(function() {
            instance = newFixtures.instance.hadoop();
        });

        it("returns true for hadoop instances", function() {
            expect(instance.isHadoop()).toBeTruthy();
        });

        it("returns false otherwise", function() {
            instance.set({instance_provider: "somethingElse"});
            expect(instance.isHadoop()).toBeFalsy();
        });
    });

    describe("#version", function() {
        var instance;
        beforeEach(function() {
            instance = newFixtures.instance.greenplum({ instanceVersion: "1234" });
        });

        it("returns the correct version number", function() {
            expect(instance.version()).toBe("1234");
        });
    });

    describe("validations", function() {
        context("with a registered instance", function() {
            beforeEach(function() {
                this.attrs = {
                    name: "foo",
                    host: "gillette",
                    db_username: "dude",
                    db_password: "whatever",
                    port: "1234",
                    maintenance_db: "postgres",
                    provision_type: "register"
                }
            });

            context("when the instance is new", function() {
                beforeEach(function() {
                    this.instance.unset("id", { silent: true });
                });

                it("returns true when the model is valid", function() {
                    expect(this.instance.performValidation(this.attrs)).toBeTruthy();
                })

                _.each(["name", "host", "db_username", "db_password", "port", "maintenance_db"], function(attr) {
                    it("requires " + attr, function() {
                        this.attrs[attr] = "";
                        expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                        expect(this.instance.errors[attr]).toBeTruthy();
                    })
                });

                it("requires valid name", function() {
                    this.attrs.name = "foo bar"
                    expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                    expect(this.instance.errors.name).toMatchTranslation("instance.validation.name_pattern")
                })

                it("requires valid port", function() {
                    this.attrs.port = "z123"
                    expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                    expect(this.instance.errors.port).toBeTruthy();
                });
            });

            context("when the instance has already been created", function() {
                it("does not require a db_username or db_password", function() {
                    delete this.attrs.db_password;
                    delete this.attrs.db_username;
                    expect(this.instance.performValidation(this.attrs)).toBeTruthy();
                });
            });
        });

        context("when creating a new instance", function() {
            beforeEach(function() {
                this.attrs = {
                    name: "foo",
                    size: "100000",
                    provision_type: "create",
                    databaseName: "thisDatabase",
                    schemaName: "thisSchema",
                    db_username: "foo",
                    db_password: "bar123"
                }
                spyOn(this.instance, "isNew").andReturn("true");
            });

            it("requires size", function() {
                this.attrs.size = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.size).toBeTruthy();
            })

            it ("requires database name", function(){
                this.attrs.databaseName = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.databaseName).toBeTruthy();
            });

            it ("requires schema name", function(){
                this.attrs.schemaName = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.schemaName).toBeTruthy();
            });

            it ("requires instance name", function(){
                this.attrs.name = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.name).toBeTruthy();
            });

            it("requires a user name", function() {
                this.attrs.db_username = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.db_username).toBeTruthy();
            });

            it("requires a password", function() {
                this.attrs.db_password = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.db_password).toBeTruthy();
            });

            it("requires size to be less than the config's max provision size", function() {
                this.attrs.size = "200";

                chorus.models.Config.instance().set({provisionMaxSizeInGB: 500});
                expect(this.instance.performValidation(this.attrs)).toBeTruthy();
                expect(this.instance.errors.size).toBeFalsy();

                chorus.models.Config.instance().set({provisionMaxSizeInGB: 100});
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.size).toBeTruthy();
            });
        });

        context("when editing a provisioned instance", function() {
            beforeEach(function() {
                this.attrs = {
                    name: "foo",
                    size: "1",
                    provision_type: "create",
                    databaseName: "thisDatabase",
                    schemaName: "thisSchema",
                    db_username: "foo",
                    db_password: "bar123"
                }
                spyOn(this.instance, "isNew").andReturn("false");
            });

            it("requires size", function() {
                this.attrs.size = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.size).toBeTruthy();
            })

            it ("requires name", function(){
                this.attrs.name = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.name).toBeTruthy();
            });

            it ("requires nothing else", function(){
                this.attrs = {name : "foo", size: "1"}
                expect(this.instance.performValidation(this.attrs)).toBeTruthy();
            });

            it("requires size to be less than the config's max provision size", function() {
                this.attrs.size = "200";

                chorus.models.Config.instance().set({provisionMaxSizeInGB: 500});
                expect(this.instance.performValidation(this.attrs)).toBeTruthy();
                expect(this.instance.errors.size).toBeFalsy();

                chorus.models.Config.instance().set({provisionMaxSizeInGB: 100});
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.size).toBeTruthy();
            });
        });


        context("when registering an existing hadoop instance", function() {
            beforeEach(function() {
                this.attrs = {
                    name: "foo",
                    size: "100000",
                    provision_type: "registerHadoop"
                }
            });

            _.each(["name", "host", "userName", "userGroups", "port"], function(attr) {
                it("requires " + attr, function() {
                    this.attrs[attr] = "";
                    expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                    expect(this.instance.errors[attr]).toBeTruthy();
                })
            });
        });
    })

    describe("#hasWorkspaceUsageInfo", function() {
        it("returns true when the instance's usage is loaded", function() {
            this.instance.usage().set({workspaces: []});
            expect(this.instance.hasWorkspaceUsageInfo()).toBeTruthy();
        });

        it("returns false when the instances's usage is not loaded", function() {
            this.instance.usage().unset("workspaces");
            expect(this.instance.hasWorkspaceUsageInfo()).toBeFalsy();
        });

        it("returns false for hadoop instances", function() {
            this.instance = newFixtures.instance.hadoop();
            this.instance.usage().set({workspaces: []});
            expect(this.instance.hasWorkspaceUsageInfo()).toBeFalsy();
        });
    });
});
