Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$size,
        [string]$outputPath
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    [float]$s = [float]$size / 128.0

    # 1. Background Squircle
    [float]$radius = 26.0 * $s
    [float]$diam = $radius * 2.0
    [float]$pos0 = 1.0 * $s
    [float]$pos1 = 127.0 * $s - $diam

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($pos0, $pos0, $diam, $diam, [float]180, [float]90)
    $path.AddArc($pos1, $pos0, $diam, $diam, [float]270, [float]90)
    $path.AddArc($pos1, $pos1, $diam, $diam, [float]0, [float]90)
    $path.AddArc($pos0, $pos1, $diam, $diam, [float]90, [float]90)
    $path.CloseFigure()

    $pStart = New-Object System.Drawing.PointF(0, 0)
    $pEnd = New-Object System.Drawing.PointF([float]$size, [float]$size)
    $c1 = [System.Drawing.ColorTranslator]::FromHtml('#1e1c18')
    $c2 = [System.Drawing.ColorTranslator]::FromHtml('#111110')
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($pStart, $pEnd, $c1, $c2)
    $g.FillPath($bgBrush, $path)

    $cBorder = [System.Drawing.ColorTranslator]::FromHtml('#3a362c')
    $borderPen = New-Object System.Drawing.Pen($cBorder, [Math]::Max([float]1.0, [float](1.5 * $s)))
    $g.DrawPath($borderPen, $path)

    # 2. Outer Lens Arcs
    $cCoral = [System.Drawing.ColorTranslator]::FromHtml('#e04461')
    $cParchment = [System.Drawing.ColorTranslator]::FromHtml('#f2eee5')

    $arcPenCoral = New-Object System.Drawing.Pen($cCoral, [Math]::Max([float]1.5, [float](3.8 * $s)))
    $arcPenCoral.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arcPenCoral.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $arcPenParchment = New-Object System.Drawing.Pen($cParchment, [Math]::Max([float]1.2, [float](3.0 * $s)))
    $arcPenParchment.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arcPenParchment.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    [float]$cx = 64.0 * $s
    [float]$cy = 64.0 * $s
    [float]$r = 44.0 * $s
    [float]$arcX = $cx - $r
    [float]$arcY = $cy - $r
    [float]$arcD = $r * 2.0

    # Coral arcs
    $g.DrawArc($arcPenCoral, $arcX, $arcY, $arcD, $arcD, [float]280, [float]75)
    $g.DrawArc($arcPenCoral, $arcX, $arcY, $arcD, $arcD, [float]100, [float]75)

    # Parchment arcs
    $g.DrawArc($arcPenParchment, $arcX, $arcY, $arcD, $arcD, [float]190, [float]75)
    $g.DrawArc($arcPenParchment, $arcX, $arcY, $arcD, $arcD, [float]10, [float]75)

    # Reticle Cardinal Ticks
    [float]$tickLen = 9.0 * $s
    $tickPen = New-Object System.Drawing.Pen($cCoral, [Math]::Max([float]1.0, [float](2.5 * $s)))
    $tickPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $tickPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $g.DrawLine($tickPen, $cx, [float](12.0 * $s), $cx, [float]((12.0 + 9.0) * $s))
    $g.DrawLine($tickPen, $cx, [float]((116.0 - 9.0) * $s), $cx, [float](116.0 * $s))
    $g.DrawLine($tickPen, [float](12.0 * $s), $cy, [float]((12.0 + 9.0) * $s), $cy)
    $g.DrawLine($tickPen, [float]((116.0 - 9.0) * $s), $cy, [float](116.0 * $s), $cy)

    # 3. Monogram Serif 'I'
    $fontBrush = New-Object System.Drawing.SolidBrush($cParchment)
    
    if ($size -ge 32) {
        # Top Serif Bar
        $g.FillRectangle($fontBrush, [float](48.0 * $s), [float](34.0 * $s), [float](32.0 * $s), [float](6.0 * $s))
        # Top bracket
        $ptsTop = @(
            (New-Object System.Drawing.PointF([float](56.0 * $s), [float](40.0 * $s))),
            (New-Object System.Drawing.PointF([float](72.0 * $s), [float](40.0 * $s))),
            (New-Object System.Drawing.PointF([float](69.0 * $s), [float](49.0 * $s))),
            (New-Object System.Drawing.PointF([float](59.0 * $s), [float](49.0 * $s)))
        )
        $g.FillPolygon($fontBrush, $ptsTop)

        # Bottom Serif Bar
        $g.FillRectangle($fontBrush, [float](48.0 * $s), [float](88.0 * $s), [float](32.0 * $s), [float](6.0 * $s))
        # Bottom bracket
        $ptsBot = @(
            (New-Object System.Drawing.PointF([float](59.0 * $s), [float](79.0 * $s))),
            (New-Object System.Drawing.PointF([float](69.0 * $s), [float](79.0 * $s))),
            (New-Object System.Drawing.PointF([float](72.0 * $s), [float](88.0 * $s))),
            (New-Object System.Drawing.PointF([float](56.0 * $s), [float](88.0 * $s)))
        )
        $g.FillPolygon($fontBrush, $ptsBot)
    }

    # Center Cutout Aperture
    [float]$cutoutR = 17.0 * $s
    $cDark = [System.Drawing.ColorTranslator]::FromHtml('#141412')
    $darkBrush = New-Object System.Drawing.SolidBrush($cDark)
    $g.FillEllipse($darkBrush, [float]($cx - $cutoutR), [float]($cy - $cutoutR), [float]($cutoutR * 2.0), [float]($cutoutR * 2.0))

    $ringPen = New-Object System.Drawing.Pen($cCoral, [Math]::Max([float]1.0, [float](1.8 * $s)))
    [float]$innerR = 12.0 * $s
    $g.DrawEllipse($ringPen, [float]($cx - $innerR), [float]($cy - $innerR), [float]($innerR * 2.0), [float]($innerR * 2.0))

    # Core Glowing Signal Dot
    [float]$glowR = 5.2 * $s
    $glowBrush = New-Object System.Drawing.SolidBrush($cCoral)
    $g.FillEllipse($glowBrush, [float]($cx - $glowR), [float]($cy - $glowR), [float]($glowR * 2.0), [float]($glowR * 2.0))

    # Core White Pinpoint Spark
    [float]$sparkR = [Math]::Max([float]1.0, [float](2.0 * $s))
    $sparkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($sparkBrush, [float]($cx - $sparkR), [float]($cy - $sparkR), [float]($sparkR * 2.0), [float]($sparkR * 2.0))

    # Save PNG
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Clean up
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "SUCCESS: $outputPath ($($size)x$($size))"
}

$outputDir = "d:\Dang\Project\Extention\instagram-tracker-v3\public"
Generate-Icon -size 16 -outputPath "$outputDir\icon-16.png"
Generate-Icon -size 32 -outputPath "$outputDir\icon-32.png"
Generate-Icon -size 48 -outputPath "$outputDir\icon-48.png"
Generate-Icon -size 128 -outputPath "$outputDir\icon-128.png"
