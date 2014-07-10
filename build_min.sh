#!/bin/bash

rm *.ipk

bash tools/deploy.sh

cp appinfo.json deploy
palm-package package deploy service
palm-install *.ipk
