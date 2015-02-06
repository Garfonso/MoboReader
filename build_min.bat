del *.ipk

call tools\deploy.bat

copy appinfo.json deploy\
call palm-package package\ deploy\ service\
call palm-install *.ipk

pscp -P 55022 -l root -pw "" -scp *.ipk 127.0.0.1:/media/internal/
adb push *.ipk /media/internal/

pscp -r -P 55022 -l root -pw "" -scp deploy/* localhost:/media/cryptofs/apps/usr/palm/applications/info.mobo.moboreader/
pscp -r -P 55022 -l root -pw "" -scp service/* localhost:/media/cryptofs/apps/usr/palm/services/info.mobo.moboreader.service/
plink -P 55022 root@localhost luna-send -n 1 palm://org.webosports.webappmanager/clearMemoryCaches '{}'

adb push deploy/. /media/cryptofs/apps/usr/palm/applications/info.mobo.moboreader/
adb push service/. /media/cryptofs/apps/usr/palm/services/info.mobo.moboreader.service/
adb shell sleep 1
adb shell luna-send -n 1 palm://org.webosports.webappmanager/clearMemoryCaches '{}'
