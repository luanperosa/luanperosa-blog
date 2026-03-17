#!/bin/bash
set -e

git checkout master
npm run build
git checkout gh-pages
git pull origin master
git push origin gh-pages --force
git checkout master
USE_SSH=true npm run deploy
