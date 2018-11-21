@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

if "%1"=="--build" (
    call :build
) else if "%1"=="-b" (
    call :build
) else (
  start /B C:/nw.js/nw "./build"
)
if not !ERRORLEVEL!==0 (
    echo An error occurred while starting application
    goto :EOF
)
:build
call yarn build && tsc -p "./build" && start /B C:/nw.js/nw "./build"
goto :EOF

goto :EOF

