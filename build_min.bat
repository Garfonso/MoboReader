del *.ipk

call tools\deploy.bat

copy appinfo.json deploy\
call palm-package package\ deploy\ service\
call palm-install *.ipk

pscp -P 55022 -l root -pw "" -scp *.ipk 127.0.0.1:/media/internal/
adb push *.ipk /media/internal/
