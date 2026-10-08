param(
  [string]$JdkPath = '',
  [string]$SdkPath = (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
)

$ErrorActionPreference = 'Stop'
$projectPath = Split-Path $PSScriptRoot -Parent
if (-not $JdkPath) {
  $portableRoot = Join-Path (Split-Path $projectPath -Parent) '.android-tools\jdk21'
  $portableJdk = if (Test-Path -LiteralPath $portableRoot) {
    Get-ChildItem -LiteralPath $portableRoot -Directory | Where-Object {
      Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe')
    } | Select-Object -First 1 -ExpandProperty FullName
  }
  if ($portableJdk) { $JdkPath = $portableJdk }
  elseif ($env:JAVA_HOME) { $JdkPath = $env:JAVA_HOME }
  else { $JdkPath = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr' }
}
if (-not (Test-Path -LiteralPath (Join-Path $JdkPath 'bin\java.exe'))) {
  throw 'No se encontró Java. Instala Android Studio o indica -JdkPath con un JDK compatible.'
}
if (-not (Test-Path -LiteralPath $SdkPath)) {
  throw 'No se encontró Android SDK. Instálalo desde Android Studio o indica -SdkPath.'
}
$jdkVersion = & (Join-Path $JdkPath 'bin\java.exe') --version
if (($jdkVersion | Select-Object -First 1) -notmatch '\b21(?:\.|\s)') {
  throw 'Esta compilación requiere JDK 21. Usa -JdkPath con Java 21; el Java de Android Studio puede ser demasiado nuevo.'
}

$previousJava = $env:JAVA_HOME
$previousSdk = $env:ANDROID_HOME
Push-Location $projectPath
try {
  $env:JAVA_HOME = $JdkPath
  $env:ANDROID_HOME = $SdkPath
  & npm.cmd run android:sync
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar/sincronizar la interfaz Android.' }
  & (Join-Path $projectPath 'android\gradlew.bat') -p android assembleDebug --console=plain
  if ($LASTEXITCODE -ne 0) { throw 'Falló Gradle. Revisa el SDK, las licencias y el error anterior.' }
  Write-Output ('APK de prueba: ' + (Join-Path $projectPath 'android\app\build\outputs\apk\debug\app-debug.apk'))
} finally {
  $env:JAVA_HOME = $previousJava
  $env:ANDROID_HOME = $previousSdk
  Pop-Location
}
