@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

set SHOULD_START=1

if "%2"=="-n" (
set SHOULD_START=0
) else if "%2"=="--no-start" (
  set SHOULD_START=0
)

if "%1"=="-t" (
set testing="25"
) else if "%1"=="--test" (
  set testing="25"
)

if "%1"=="--build" (
  goto :build
) else if "%1"=="-b" (
  goto :build
) else (
  goto :start
)
if not !ERRORLEVEL!==0 (
    echo An error occurred while starting application
    goto :END
)
:build
call yarn build 
REM && tsc -p "./build"
if not !ERRORLEVEL!==0 (
    echo An error occurred while building application
    goto :END
)
if "%SHOULD_START%"=="1" (
  goto :start
)
goto :END

:start
start /B C:/nw.js/nw "./build"
goto :END

:END
if not !ERRORLEVEL!==0 (
    echo An error occurred while starting application
    goto :EOF
) else (
    echo Application start was a success!
)
goto :EOF

