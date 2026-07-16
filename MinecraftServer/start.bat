@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "BOT_DIR=%ROOT_DIR%..\cobblewright"
set "PG_CONTAINER=cobblewright-postgres"
set "MC_STATUS=not started"
set "PG_STATUS=not checked"
set "BOT_STATUS=not launched"

echo [Startup] Checking PostgreSQL (Docker)...
where docker >nul 2>nul
if not errorlevel 1 (
	docker info >nul 2>nul
	if errorlevel 1 (
		echo [Startup] Docker is installed, but daemon is not running. Start Docker Desktop to enable PostgreSQL auto-start.
		set "PG_STATUS=docker daemon not running"
	) else (
		docker container inspect "%PG_CONTAINER%" >nul 2>nul
		if errorlevel 1 (
			echo [Startup] Creating PostgreSQL container "%PG_CONTAINER%"...
			docker run -d --name "%PG_CONTAINER%" -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cobblewright -p 5432:5432 pgvector/pgvector:pg16 >nul
			if errorlevel 1 (
				echo [Startup] Failed to create PostgreSQL container.
				set "PG_STATUS=create failed"
			) else (
				echo [Startup] PostgreSQL container created.
				set "PG_STATUS=container created"
			)
		) else (
			docker inspect -f "{{.State.Running}}" "%PG_CONTAINER%" | findstr /I "true" >nul
			if not errorlevel 1 (
				echo [Startup] PostgreSQL container "%PG_CONTAINER%" is already running.
				set "PG_STATUS=already running"
			) else (
				echo [Startup] Starting existing PostgreSQL container "%PG_CONTAINER%"...
				docker start "%PG_CONTAINER%" >nul
				if errorlevel 1 (
					echo [Startup] Failed to start PostgreSQL container.
					set "PG_STATUS=start failed"
				) else (
					set "PG_STATUS=container started"
				)
			)
		)

		echo [Startup] Waiting for PostgreSQL to accept connections on 5432...
		powershell -NoProfile -Command "$ready=$false; 1..60 | ForEach-Object { if ((Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded) { $ready=$true; break }; Start-Sleep -Seconds 1 }; if ($ready) { exit 0 } else { exit 1 }" >nul 2>nul
		if not errorlevel 1 (
			echo [Startup] PostgreSQL is ready.
			set "PG_STATUS=ready"
		) else (
			echo [Startup] PostgreSQL did not become ready. Bot may run without long-term memory.
			set "PG_STATUS=not ready"
		)
	)
) else (
	echo [Startup] Docker not found. Skipping PostgreSQL auto-start.
	set "PG_STATUS=docker not found"
)

powershell -NoProfile -Command "if ((Get-NetTCPConnection -State Listen -LocalPort 25565 -ErrorAction SilentlyContinue)) { exit 0 } else { exit 1 }" >nul 2>nul
if not errorlevel 1 (
	echo [Startup] Minecraft server appears to already be running on port 25565. Skipping duplicate launch.
	set "MC_STATUS=already running"
) else (
	echo [Startup] Launching Minecraft server in a new terminal...
	start "Minecraft Server" cmd /k "cd /d ""%ROOT_DIR%"" && java -Xmx4G -Xms4G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:MaxTenuringThreshold=1 -Daikars.new.flags=true -jar server.jar nogui"
	set "MC_STATUS=started"
)

echo [Startup] Waiting 30 seconds for server boot...
timeout /t 30 /nobreak >nul

if exist "%BOT_DIR%\package.json" (
	powershell -NoProfile -Command "$running = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(node|node\.exe)$' -and $_.CommandLine -like '*architect.js*' }; if ($running) { exit 0 } else { exit 1 }" >nul 2>nul
	if not errorlevel 1 (
		echo [Startup] CobbleWright bot already appears to be running. Skipping duplicate launch.
		set "BOT_STATUS=already running"
	) else (
		echo [Startup] Launching CobbleWright bot...
		start "CobbleWright Bot" cmd /k "cd /d ""%BOT_DIR%"" && npm start"
		set "BOT_STATUS=launched"
	)
) else (
	echo [Startup] Bot folder not found at "%BOT_DIR%". Skipping bot start.
	set "BOT_STATUS=missing bot folder"
)

echo.
echo [Startup] Health Summary
echo [Startup] Minecraft: %MC_STATUS%
echo [Startup] PostgreSQL: %PG_STATUS%
echo [Startup] Bot: %BOT_STATUS%

pause
