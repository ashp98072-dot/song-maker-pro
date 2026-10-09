param(
  [ValidateRange(1, 2147483647)][int]$VersionCode = 1,
  [ValidateNotNullOrEmpty()][string]$VersionName = '1.0',
  [string]$JdkPath = '',
  [string]$SdkPath = (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
)

$ErrorActionPreference = 'Stop'
foreach ($variableName in @('ANDROID_UPLOAD_STORE_FILE', 'ANDROID_UPLOAD_STORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD')) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($variableName))) {
    throw ('Falta ' + $variableName + '. Consulta docs/android-release.md; no uses la firma debug para publicar.')
  }
}
if (-not (Test-Path -LiteralPath $env:ANDROID_UPLOAD_STORE_FILE -PathType Leaf)) { throw 'No existe el keystore indicado.' }
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
  & (Join-Path $projectPath 'android\gradlew.bat') -p android bundleRelease "-PreleaseVersionCode=$VersionCode" "-PreleaseVersionName=$VersionName" --console=plain
  if ($LASTEXITCODE -ne 0) { throw 'Falló Gradle. Revisa el SDK, las licencias y el error anterior.' }
  $bundlePath = Join-Path $projectPath 'android\app\build\outputs\bundle\release\app-release.aab'
  if (-not (Test-Path -LiteralPath $bundlePath)) { throw 'No se generó el AAB.' }
  $verification = & (Join-Path $JdkPath 'bin\jarsigner.exe') '-J-Duser.language=en' -verify $bundlePath
  Write-Output $verification
  if ($LASTEXITCODE -ne 0 -or ($verification -join ' ') -notmatch 'jar verified\.') { throw 'Falló la verificación de firma del AAB.' }
  Write-Output ('AAB firmado: ' + $bundlePath)
} finally {
  $env:JAVA_HOME = $previousJava
  $env:ANDROID_HOME = $previousSdk
  Pop-Location
}
