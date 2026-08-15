using System;
using System.Diagnostics;
using System.IO;

internal static class DMForgeLauncher
{
    [STAThread]
    private static int Main()
    {
        try
        {
            var root = AppDomain.CurrentDomain.BaseDirectory;
            var script = Path.Combine(root, "scripts", "launch-app.ps1");
            if (!File.Exists(script))
            {
                throw new FileNotFoundException("DMForge launcher script is missing.", script);
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + script + "\"",
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            Process.Start(startInfo);
            return 0;
        }
        catch (Exception error)
        {
            System.Windows.Forms.MessageBox.Show(
                "DMForge 无法启动。\n\n" + error.Message,
                "DMForge",
                System.Windows.Forms.MessageBoxButtons.OK,
                System.Windows.Forms.MessageBoxIcon.Error
            );
            return 1;
        }
    }
}
