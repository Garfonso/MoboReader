#!/bin/bash

rm *.ipk

bash tools/deploy.sh

cp appinfo.json deploy

scp -r -P 55022 deploy/* root@localhost:/media/cryptofs/apps/usr/palm/applications/info.mobo.moboreader/
scp -r -P 55022 service/* root@localhost:/media/cryptofs/apps/usr/palm/services/info.mobo.moboreader.storage/

palm-package package deploy service
palm-install *.ipk
scp -P 55022 info.mobo.moboreader_0.0.3_all.ipk root@localhost:/media/internal
