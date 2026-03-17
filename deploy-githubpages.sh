#!/bin/bash
set -e

git checkout master
git pull origin master
npm run build
USE_SSH=true npm run deploy
