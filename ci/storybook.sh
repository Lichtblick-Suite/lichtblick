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
branch=${GITHUB_HEAD_REF:-}
if [ "$branch" != "" ]; then
    (
        set -x
        git fetch origin "$branch"
        git checkout "$branch" || git checkout -b "$branch"
        git reset --hard "origin/$branch"
    )
fi

(
    set -x
    yarn run storybook:reg-suit
)
