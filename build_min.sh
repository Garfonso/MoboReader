#!/bin/bash

rm *.ipk

bash tools/deploy.sh

cp appinfo.json deploy

scp -r -P 55022 deploy/* root@localhost:/media/cryptofs/apps/usr/palm/applications/info.mobo.moboreader/
scp -r -P 55022 service/* root@localhost:/media/cryptofs/apps/usr/palm/services/info.mobo.moboreader.service/

ssh p 55022 root@localhost luna-send -n 1 palm://org.webosports.webappmanager/clearMemoryCaches '{}'

palm-package package deploy service
palm-install *.ipk
scp -P 55022 info.mobo.moboreader_*_all.ipk root@localhost:/media/internal

adb push deploy/. /media/cryptofs/apps/usr/palm/applications/info.mobo.moboreader/
adb push service/. /media/cryptofs/apps/usr/palm/services/info.mobo.moboreader.service/
adb shell sleep 1
adb shell luna-send -n 1 palm://org.webosports.webappmanager/clearMemoryCaches '{}'