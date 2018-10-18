setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

if "%1"=="build" (
    call yarn build && start /B C:/nw.js/nw "./build"
    ) else (
        start /B C:/nw.js/nw "./build"
        )
if not !ERRORLEVEL!=0 (
    echo An error occurred while starting application
)
goto :EOF

