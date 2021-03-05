#!/bin/bash

# Runs storybook in CI:
#  1. build storybook
#  2. capture screenshots (via storycap)
#  3. upload & compare screenshots (via reg-suit)

set -euo pipefail

(
    set -x
    yarn run storybook:build
    yarn run storybook:storycap
)

# If this is a PR, then by default github actions has us on a merge commit.
# Checkout the feature branch and commit to make reg-suit happy.
pr_branch=${GITHUB_HEAD_REF:-}
publish_args=
if [ "$pr_branch" != "" ]; then
    (
        set -x
        git fetch origin "$pr_branch"
        git checkout "$pr_branch" || git checkout -b "$pr_branch"
        git reset --hard "origin/$pr_branch"
    )

    # Don't set github status checks on main branch
    publish_args="-n"
fi

(
    set -x
    yarn workspace @foxglove-studio/app run reg-suit sync-expected
    yarn workspace @foxglove-studio/app run reg-suit compare
    yarn workspace @foxglove-studio/app run reg-suit publish "$publish_args"
)
