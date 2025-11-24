
Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$InputFile,
        [string]$OutputFile,
        [int]$Width,
        [int]$Height
    )

    $srcImage = [System.Drawing.Image]::FromFile($InputFile)
    $newImage = new-object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($newImage)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $graphics.DrawImage($srcImage, 0, 0, $Width, $Height)
    
    $newImage.Save($OutputFile, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $srcImage.Dispose()
    $newImage.Dispose()
    $graphics.Dispose()
    
    Write-Host "Resized $InputFile to $OutputFile ($Width x $Height)"
}

# Source images (using the artifact paths)
$sourceLogo = "C:\Users\vl4dt\.gemini\antigravity\brain\1c4cc5ef-1a4f-4290-a7cc-b323bdba5841\logo_base_1763885667695.png"
$sourceAttention = "C:\Users\vl4dt\.gemini\antigravity\brain\1c4cc5ef-1a4f-4290-a7cc-b323bdba5841\logo_attention_1763885679152.png"

# Resize Logo
Resize-Image -InputFile $sourceLogo -OutputFile "public/icons/logo_16.png" -Width 16 -Height 16
Resize-Image -InputFile $sourceLogo -OutputFile "public/icons/logo_48.png" -Width 48 -Height 48
Resize-Image -InputFile $sourceLogo -OutputFile "public/icons/logo_128.png" -Width 128 -Height 128

# Resize Attention
Resize-Image -InputFile $sourceAttention -OutputFile "public/icons/attention_16.png" -Width 16 -Height 16
Resize-Image -InputFile $sourceAttention -OutputFile "public/icons/attention_48.png" -Width 48 -Height 48
Resize-Image -InputFile $sourceAttention -OutputFile "public/icons/attention_128.png" -Width 128 -Height 128
