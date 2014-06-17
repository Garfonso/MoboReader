del *.ipk

call tools\deploy.bat

copy appinfo.json deploy\
call palm-package deploy\
call palm-install -d emulator *.ipk
REM pscp -P 55022 -l root -pw "" -scp *.ipk 127.0.0.1:/media/internal/
