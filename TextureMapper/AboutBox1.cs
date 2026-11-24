using System;
using System.ComponentModel;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;
using TextureMapper.Properties;

namespace TextureMapper
{
	internal partial class AboutBox1 : Form
	{
		public string AssemblyTitle
		{
			get
			{
				object[] customAttributes = Assembly.GetExecutingAssembly().GetCustomAttributes(typeof(AssemblyTitleAttribute), false);
				if (customAttributes.Length > 0)
				{
					AssemblyTitleAttribute assemblyTitleAttribute = (AssemblyTitleAttribute)customAttributes[0];
					if (assemblyTitleAttribute.Title != "")
					{
						return assemblyTitleAttribute.Title;
					}
				}
				return Path.GetFileNameWithoutExtension(Assembly.GetExecutingAssembly().CodeBase);
			}
		}

		public string AssemblyVersion
		{
			get
			{
				return Assembly.GetExecutingAssembly().GetName().Version.ToString();
			}
		}

		public string AssemblyDescription
		{
			get
			{
				object[] customAttributes = Assembly.GetExecutingAssembly().GetCustomAttributes(typeof(AssemblyDescriptionAttribute), false);
				if (customAttributes.Length == 0)
				{
					return "";
				}
				return ((AssemblyDescriptionAttribute)customAttributes[0]).Description;
			}
		}

		public string AssemblyProduct
		{
			get
			{
				object[] customAttributes = Assembly.GetExecutingAssembly().GetCustomAttributes(typeof(AssemblyProductAttribute), false);
				if (customAttributes.Length == 0)
				{
					return "";
				}
				return ((AssemblyProductAttribute)customAttributes[0]).Product;
			}
		}

		public string AssemblyCopyright
		{
			get
			{
				object[] customAttributes = Assembly.GetExecutingAssembly().GetCustomAttributes(typeof(AssemblyCopyrightAttribute), false);
				if (customAttributes.Length == 0)
				{
					return "";
				}
				return ((AssemblyCopyrightAttribute)customAttributes[0]).Copyright;
			}
		}

		public string AssemblyCompany
		{
			get
			{
				object[] customAttributes = Assembly.GetExecutingAssembly().GetCustomAttributes(typeof(AssemblyCompanyAttribute), false);
				if (customAttributes.Length == 0)
				{
					return "";
				}
				return ((AssemblyCompanyAttribute)customAttributes[0]).Company;
			}
		}

		public AboutBox1()
		{
			InitializeComponent();
			Text = string.Format("About {0}", AssemblyTitle);
			labelProductName.Text = AssemblyProduct;
			labelVersion.Text = string.Format("Version {0}", AssemblyVersion);
			labelCopyright.Text = AssemblyCopyright;
			labelCompanyName.Text = AssemblyCompany;
			textBoxDescription.Text = AssemblyDescription;
		}

		private void RegisterButton_Click(object sender, EventArgs e)
		{
			if (IsValid(NameTextBox.Text, SerialNumberTextBox.Text))
			{
				MessageBox.Show("Registration Successful");
				Application.UserAppDataRegistry.SetValue("Name", NameTextBox.Text);
				Application.UserAppDataRegistry.SetValue("Serial", SerialNumberTextBox.Text);
				InitializeUI();
			}
			else
			{
				MessageBox.Show("Registration Failed");
			}
		}

		private void InitializeUI()
		{
			string text = (string)Application.UserAppDataRegistry.GetValue("Name", string.Empty);
			string text2 = (string)Application.UserAppDataRegistry.GetValue("Serial", string.Empty);
			if (IsValid(text, text2))
			{
				NameTextBox.Enabled = false;
				NameTextBox.Text = text;
				SerialNumberTextBox.Enabled = false;
				SerialNumberTextBox.Text = text2;
				RegistrationStatusLabel.Text = "Registered";
				RegisterButton.Visible = false;
			}
		}

		private void AboutBox1_Load(object sender, EventArgs e)
		{
			InitializeUI();
		}

		internal static bool IsRegistered()
		{
			string text = (string)Application.UserAppDataRegistry.GetValue("Name", string.Empty);
			if (string.IsNullOrEmpty(text))
			{
				return false;
			}
			string text2 = (string)Application.UserAppDataRegistry.GetValue("Serial", string.Empty);
			if (string.IsNullOrEmpty(text2))
			{
				return false;
			}
			return IsValid(text, text2);
		}

		internal static bool IsValid(string name, string serial)
		{
			if (string.IsNullOrEmpty(name))
			{
				return false;
			}
			if (string.IsNullOrEmpty(serial))
			{
				return false;
			}
			SHA1 sHA = SHA1.Create();
			byte[] bytes = Encoding.UTF8.GetBytes(name + "shakE wel.l bef?ore ope''ni#Ng 163mL");
			string text = BitConverter.ToString(sHA.ComputeHash(bytes)).Replace("-", "");
			return text.Substring(4, 16) == serial;
		}
	}
}
