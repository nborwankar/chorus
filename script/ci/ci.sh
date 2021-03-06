#!/bin/bash

export RAILS_ENV=test
GPDB_HOST=chorus-gpdb42
HDFS_HOST=chorus-gphd02.sf.pivotallabs.com

. script/ci/setup.sh

set -e

b/rake assets:precompile --trace

echo "starting gpfdist (Linux RHEL5 only)"
export LD_LIBRARY_PATH=vendor/gpfdist-rhel5/lib:${LD_LIBRARY_PATH}
./vendor/gpfdist-rhel5/bin/gpfdist -p 8000 -d /tmp &
./vendor/gpfdist-rhel5/bin/gpfdist -p 8001 -d /tmp &

# start jasmine
b/rake jasmine > $WORKSPACE/jasmine.log 2>&1 &
jasmine_pid=$!
echo "Jasmine process id is : $jasmine_pid"
echo $jasmine_pid > tmp/pids/jasmine-$RAILS_ENV.pid

sleep 30

set +e

unset RAILS_ENV

echo "Running unit tests"
mv .rspec-ci .rspec
GPDB_HOST=$GPDB_HOST b/rake -f `bundle show ci_reporter`/stub.rake ci:setup:rspec spec 2>&1
RUBY_TESTS_RESULT=$?

echo "Running javascript tests"
CI_REPORTS=spec/javascripts/reports b/rake -f `bundle show ci_reporter`/stub.rake ci:setup:rspec phantom 2>&1
JS_TESTS_RESULT=$?

echo "Cleaning up jasmine process $jasmine_pid"
kill -s SIGTERM $jasmine_pid

echo "Cleaning up gpfdist"
killall gpfdist

echo "Running legacy migration tests"
b/rake db:test:prepare
RAILS_ENV=test packaging/chorus_migrate.sh db/legacy/legacy.sql
b/rake spec:legacy_migration
LEGACY_MIGRATION_TESTS_RESULT=$?

echo "Running API docs check"
b/rake api_docs:check
API_DOCS_CHECK_RESULT=$?

SUCCESS=`expr $RUBY_TESTS_RESULT + $JS_TESTS_RESULT + $LEGACY_MIGRATION_TESTS_RESULT + $API_DOCS_CHECK_RESULT`
echo "RSpec exit code: $RUBY_TESTS_RESULT"
echo "Jasmine exit code: $JS_TESTS_RESULT"
echo "Legacy migration exit code: $LEGACY_MIGRATION_TESTS_RESULT"
echo "API docs check exit code: $API_DOCS_CHECK_RESULT"
exit $SUCCESS
