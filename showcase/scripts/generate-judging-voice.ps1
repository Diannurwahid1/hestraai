param(
  [string]$InputPath = "scripts/judging-narration.txt",
  [string]$OutputPath = "public/audio/hestra-judging-voiceover.wav"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.SelectVoice("Microsoft Zira Desktop")
$voice.Rate = 1
$voice.Volume = 100
$text = Get-Content -Raw -LiteralPath $InputPath
$output = [System.IO.Path]::GetFullPath($OutputPath)
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($output)) | Out-Null
$voice.SetOutputToWaveFile($output)
$voice.Speak($text)
$voice.Dispose()
Write-Output $output
