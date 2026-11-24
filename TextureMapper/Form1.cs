using System;
using System.ComponentModel;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using TextureMapper.Properties;

namespace TextureMapper
{
	public partial class Form1 : Form
	{
		private bool isMouseDown;

		private Action action;

		private Size SelectionSize = default(Size);

		private Point SelectionLocation = default(Point);

		private Point SelectionStart = default(Point);

		private Point SelectionEnd = default(Point);

		private Point SelectionOffset = default(Point);

		private Rectangle RubberBand = default(Rectangle);

		private bool updatingText;

		public bool IsMouseDown
		{
			get
			{
				return isMouseDown;
			}
			set
			{
				if (value != isMouseDown)
				{
					isMouseDown = value;
				}
			}
		}

		public Action Action
		{
			get
			{
				return action;
			}
			set
			{
				if (action != value)
				{
					action = value;
				}
			}
		}

		public WrapMode WrapMode
		{
			get
			{
				if (FlipHorizontalCheckBox.Checked)
				{
					if (FlipVerticalCheckBox.Checked)
					{
						return WrapMode.TileFlipXY;
					}
					return WrapMode.TileFlipX;
				}
				if (FlipVerticalCheckBox.Checked)
				{
					return WrapMode.TileFlipY;
				}
				return WrapMode.Tile;
			}
		}

		public Form1()
		{
			InitializeComponent();
		}

		private void pictureBox1_Paint(object sender, PaintEventArgs e)
		{
			if (OriginalImage.BackgroundImage == null || RubberBand.Size.Height == 0 || RubberBand.Size.Width == 0)
			{
				return;
			}
			Bitmap source = new Bitmap(OriginalImage.BackgroundImage, OriginalImage.Width, OriginalImage.Height);
			PreviewPictureBox.Image = CopyBitmap(source, RubberBand, WrapMode);
			e.Graphics.SmoothingMode = SmoothingMode.None;
			Rectangle rect = new Rectangle(RubberBand.Location, RubberBand.Size);
			if (rect.X < -10)
			{
				rect.Width -= rect.X + 10;
				rect.X = -10;
			}
			if (rect.Y < -1)
			{
				rect.Height -= rect.Y + 10;
				rect.Y = -10;
			}
			if (rect.Width > OriginalImage.Width + 10)
			{
				rect.Width = OriginalImage.Width + 10;
			}
			if (rect.Height > OriginalImage.Height + 10)
			{
				rect.Height = OriginalImage.Height + 10;
			}
			using (Pen pen = new Pen(new SolidBrush(Color.White)))
			{
				pen.Width = 2f;
				e.Graphics.DrawRectangle(pen, rect);
				pen.Color = Color.Black;
				pen.DashStyle = DashStyle.Dash;
				pen.LineJoin = LineJoin.Round;
				e.Graphics.DrawRectangle(pen, rect);
			}
		}

		protected Bitmap CopyBitmap(Image source, Rectangle copyArea, WrapMode wrapMode)
		{
			if (copyArea.Width == 0 || copyArea.Height == 0)
			{
				return new Bitmap(32, 32);
			}
			if ((double)copyArea.Width >= Math.Pow(2.0, 15.0) || (double)copyArea.Height >= Math.Pow(2.0, 15.0))
			{
				return new Bitmap(32, 32);
			}
			bool flag = wrapMode == WrapMode.TileFlipXY || wrapMode == WrapMode.TileFlipX;
			bool flag2 = wrapMode == WrapMode.TileFlipXY || wrapMode == WrapMode.TileFlipY;
			Bitmap bitmap = new Bitmap(copyArea.Width, copyArea.Height);
			using (Graphics graphics = Graphics.FromImage(bitmap))
			{
				graphics.ScaleTransform((!flag) ? 1 : (-1), (!flag2) ? 1 : (-1), MatrixOrder.Append);
				Rectangle destRect = new Rectangle(flag ? (-bitmap.Width) : 0, flag2 ? (-bitmap.Height) : 0, bitmap.Width, bitmap.Height);
				try
				{
					graphics.DrawImage(source, destRect, copyArea, GraphicsUnit.Pixel);
				}
				catch (ArgumentException)
				{
				}
			}
			return bitmap;
		}

		private void pictureBox1_MouseMove(object sender, MouseEventArgs e)
		{
			if (e.Button == MouseButtons.Left)
			{
				if (IsMouseDown)
				{
					switch (Action)
					{
					case Action.Select:
						ContinueSelecting(e.Location);
						break;
					case Action.Move:
						ContinueMoving(e.Location);
						break;
					case Action.ScaleTop:
						ContinueScalingTop(e.Location);
						break;
					case Action.ScaleBottom:
						ContinueScalingBottom(e.Location);
						break;
					case Action.ScaleLeft:
						ContinueScalingLeft(e.Location);
						break;
					case Action.ScaleRight:
						ContinueScalingRight(e.Location);
						break;
					case Action.ScaleTopLeft:
						ContinueScalingTopLeft(e.Location);
						break;
					case Action.ScaleTopRight:
						ContinueScalingTopRight(e.Location);
						break;
					case Action.ScaleBottomRight:
						ContinueScalingBottomRight(e.Location);
						break;
					case Action.ScaleBottomLeft:
						ContinueScalingBottomLeft(e.Location);
						break;
					}
				}
				else
				{
					IsMouseDown = true;
					Action = FindAction(e.Location, RubberBand);
					switch (Action)
					{
					case Action.Select:
						StartSelecting(e.Location);
						break;
					case Action.Move:
						StartMoving(e.Location);
						break;
					case Action.ScaleTop:
						StartScalingTop(e.Location);
						break;
					case Action.ScaleBottom:
						StartScalingBottom(e.Location);
						break;
					case Action.ScaleLeft:
						StartScalingLeft(e.Location);
						break;
					case Action.ScaleRight:
						StartScalingRight(e.Location);
						break;
					case Action.ScaleTopLeft:
						StartScalingTopLeft(e.Location);
						break;
					case Action.ScaleTopRight:
					case Action.ScaleBottomLeft:
					case Action.ScaleBottomRight:
						break;
					}
				}
			}
			else
			{
				IsMouseDown = false;
				Action = Action.None;
				OriginalImage.Cursor = ChooseCursor(e.Location, RubberBand);
			}
		}

		private void ContinueScalingBottomLeft(Point point)
		{
			int height = Math.Abs(point.Y - RubberBand.Top);
			int width = Math.Abs(RubberBand.Width + (RubberBand.Left - point.X));
			RubberBand = new Rectangle(new Point(point.X, RubberBand.Y), new Size(width, height));
			UpdateInfo();
		}

		private void ContinueScalingBottomRight(Point point)
		{
			int height = Math.Abs(point.Y - RubberBand.Top);
			int width = Math.Abs(point.X - RubberBand.Left);
			RubberBand = new Rectangle(RubberBand.Location, new Size(width, height));
			UpdateInfo();
		}

		private void ContinueScalingTopRight(Point point)
		{
			int height = Math.Abs(RubberBand.Height + (RubberBand.Top - point.Y));
			int width = Math.Abs(point.X - RubberBand.Left);
			RubberBand = new Rectangle(new Point(RubberBand.X, point.Y), new Size(width, height));
			UpdateInfo();
		}

		private void ContinueScalingTopLeft(Point point)
		{
			int height = Math.Abs(RubberBand.Height + (RubberBand.Top - point.Y));
			int width = Math.Abs(RubberBand.Width + (RubberBand.Left - point.X));
			RubberBand = new Rectangle(point, new Size(width, height));
			UpdateInfo();
		}

		private void StartScalingTopLeft(Point point)
		{
			UpdateInfo();
		}

		private void ContinueScalingRight(Point point)
		{
			int width = Math.Abs(point.X - RubberBand.Left);
			RubberBand = new Rectangle(RubberBand.Location, new Size(width, RubberBand.Height));
			UpdateInfo();
		}

		private void StartScalingRight(Point point)
		{
			UpdateInfo();
		}

		private void ContinueScalingLeft(Point point)
		{
			int width = Math.Abs(RubberBand.Width + (RubberBand.Left - point.X));
			RubberBand = new Rectangle(point.X, RubberBand.Y, width, RubberBand.Height);
			UpdateInfo();
		}

		private void StartScalingLeft(Point point)
		{
			UpdateInfo();
		}

		private void ContinueScalingBottom(Point point)
		{
			int height = Math.Abs(point.Y - RubberBand.Top);
			RubberBand = new Rectangle(RubberBand.Location, new Size(RubberBand.Width, height));
			UpdateInfo();
		}

		private void StartScalingBottom(Point point)
		{
			UpdateInfo();
		}

		private void ContinueScalingTop(Point point)
		{
			int height = Math.Abs(RubberBand.Height + (RubberBand.Top - point.Y));
			RubberBand = new Rectangle(RubberBand.X, point.Y, RubberBand.Width, height);
			UpdateInfo();
		}

		private void StartScalingTop(Point point)
		{
			UpdateInfo();
		}

		private void StartMoving(Point point)
		{
			SelectionOffset = new Point(point.X - RubberBand.X, point.Y - RubberBand.Y);
			UpdateInfo();
		}

		private void ContinueMoving(Point point)
		{
			Point location = new Point(point.X - SelectionOffset.X, point.Y - SelectionOffset.Y);
			RubberBand = new Rectangle(location, RubberBand.Size);
			UpdateInfo();
		}

		private void StartSelecting(Point point)
		{
			RubberBand = new Rectangle(point, new Size(1, 1));
			SelectionStart = point;
			OriginalImage.Invalidate();
		}

		private void ContinueSelecting(Point point)
		{
			SelectionEnd = point;
			SelectionSize = DetermineSize(SelectionStart, SelectionEnd);
			SelectionLocation = DetermineLocation(SelectionStart, SelectionEnd);
			RubberBand = new Rectangle(SelectionLocation, SelectionSize);
			UpdateInfo();
		}

		private void UpdateSelection()
		{
			decimal num = 1m;
			if (MappingComboBox.SelectedIndex == 1)
			{
				num = 0.5m;
			}
			decimal value = RepeatsHorizontalUpDown.Value;
			RubberBand.Width = (int)(value * num * (decimal)OriginalImage.Width);
			value = RepeatsVerticalUpDown.Value;
			RubberBand.Height = (int)(value * num * (decimal)OriginalImage.Height);
			value = OffsetHorizontalUpDown.Value;
			value *= (decimal)OriginalImage.Width;
			value += (decimal)OriginalImage.Width * 0.5m;
			value -= (decimal)RubberBand.Width * 0.5m;
			RubberBand.X = (int)value;
			value = OffsetVerticalUpDown.Value;
			value *= (decimal)OriginalImage.Height;
			value *= -1m;
			value += (decimal)OriginalImage.Height * 0.5m;
			value -= (decimal)RubberBand.Height * 0.5m;
			RubberBand.Y = (int)value;
			OriginalImage.Invalidate();
			Application.DoEvents();
		}

		private void UpdateInfo()
		{
			updatingText = true;
			OriginalImage.Invalidate();
			RepeatsHorizontalUpDown.Value = RepeatsHorizontal();
			RepeatsVerticalUpDown.Value = RepeatsVertical();
			OffsetHorizontalUpDown.Value = OffsetHorizontal();
			OffsetVerticalUpDown.Value = OffsetVertical();
			Application.DoEvents();
			updatingText = false;
		}

		private Action FindAction(Point point, Rectangle r)
		{
			int num = 5;
			if (Distance(point, new Point(r.Left, r.Top)) < (double)num)
			{
				return Action.ScaleTopLeft;
			}
			if (Distance(point, new Point(r.Right, r.Top)) < (double)num)
			{
				return Action.ScaleTopRight;
			}
			if (Distance(point, new Point(r.Right, r.Bottom)) < (double)num)
			{
				return Action.ScaleBottomRight;
			}
			if (Distance(point, new Point(r.Left, r.Bottom)) < (double)num)
			{
				return Action.ScaleBottomLeft;
			}
			if (Distance(point, new Point(r.Left, point.Y)) < (double)num && point.Y >= r.Top && point.Y <= r.Bottom)
			{
				return Action.ScaleLeft;
			}
			if (Distance(point, new Point(r.Right, point.Y)) < (double)num && point.Y >= r.Top && point.Y <= r.Bottom)
			{
				return Action.ScaleRight;
			}
			if (Distance(point, new Point(point.X, r.Top)) < (double)num && point.X >= r.Left && point.X <= r.Right)
			{
				return Action.ScaleTop;
			}
			if (Distance(point, new Point(point.X, r.Bottom)) < (double)num && point.X >= r.Left && point.X <= r.Right)
			{
				return Action.ScaleBottom;
			}
			if (r.Contains(point))
			{
				return Action.Move;
			}
			return Action.Select;
		}

		private Cursor ChooseCursor(Point point, Rectangle r)
		{
			switch (FindAction(point, r))
			{
			case Action.ScaleLeft:
			case Action.ScaleRight:
				return Cursors.SizeWE;
			case Action.ScaleTop:
			case Action.ScaleBottom:
				return Cursors.SizeNS;
			case Action.ScaleTopLeft:
			case Action.ScaleBottomRight:
				return Cursors.SizeNWSE;
			case Action.ScaleTopRight:
			case Action.ScaleBottomLeft:
				return Cursors.SizeNESW;
			case Action.Move:
				return Cursors.SizeAll;
			default:
				return Cursors.Default;
			}
		}

		private double Distance(Point a, Point b)
		{
			double num = a.X - b.X;
			double num2 = a.Y - b.Y;
			return Math.Sqrt(num * num + num2 * num2);
		}

		private decimal OffsetVertical()
		{
			decimal num = (decimal)RubberBand.Y + (decimal)RubberBand.Height / 2.0m;
			decimal num2 = (decimal)OriginalImage.Height * 0.5m;
			num -= num2;
			num *= -1m;
			num /= (decimal)OriginalImage.Height;
			if (num < -1m)
			{
				return -1m;
			}
			if (num > 1m)
			{
				return 1m;
			}
			return num;
		}

		private decimal OffsetHorizontal()
		{
			decimal num = (decimal)RubberBand.X + (decimal)RubberBand.Width / 2.0m;
			decimal num2 = (decimal)OriginalImage.Width * 0.5m;
			num -= num2;
			num /= (decimal)OriginalImage.Width;
			if (num < -1m)
			{
				return -1m;
			}
			if (num > 1m)
			{
				return 1m;
			}
			return num;
		}

		private decimal RepeatsHorizontal()
		{
			decimal num = 1m;
			if (MappingComboBox.SelectedIndex == 1)
			{
				num = 2m;
			}
			decimal num2 = RubberBand.Width;
			decimal num3 = OriginalImage.Width;
			return num2 / num3 * num;
		}

		private decimal RepeatsVertical()
		{
			decimal num = 1m;
			if (MappingComboBox.SelectedIndex == 1)
			{
				num = 2m;
			}
			decimal num2 = RubberBand.Height;
			decimal num3 = OriginalImage.Height;
			return num2 / num3 * num;
		}

		private Size DetermineSize(Point point1, Point point2)
		{
			return new Size(Math.Abs(point1.X - point2.X), Math.Abs(point1.Y - point2.Y));
		}

		private Point DetermineLocation(Point point1, Point point2)
		{
			Point result = new Point(point1.X, point1.Y);
			if (point2.X < result.X)
			{
				result.X = point2.X;
			}
			if (point2.Y < result.Y)
			{
				result.Y = point2.Y;
			}
			return result;
		}

		private void pictureBox1_Click(object sender, EventArgs e)
		{
		}

		private void LoadImageButton_Click(object sender, EventArgs e)
		{
			if (string.IsNullOrEmpty(openFileDialog1.InitialDirectory))
			{
				string location = Assembly.GetExecutingAssembly().Location;
				openFileDialog1.InitialDirectory = Path.GetDirectoryName(location);
			}
			openFileDialog1.DefaultExt = "jpg";
			openFileDialog1.Filter = "Images (*.BMP;*.JPG;*.GIF;*.PNG)|*.BMP;*.JPG;*.GIF;*.PNG|Bitmap (*.BMP)|*.BMP|JPEG (*.JPG)|*.JPG|GIF (*.GIF)|*.GIF|PNG (*.PNG)|*.PNG|All files (*.*)|*.*";
			if (openFileDialog1.ShowDialog() != DialogResult.Cancel)
			{
				try
				{
					OriginalImage.BackgroundImage = new Bitmap(openFileDialog1.FileName);
				}
				catch (Exception)
				{
					MessageBox.Show("Could not load image.");
				}
				UpdateInfo();
			}
		}

		private void Form1_Load(object sender, EventArgs e)
		{
			MappingComboBox.Items.Add("Default");
			MappingComboBox.Items.Add("Planar");
			MappingComboBox.SelectedIndex = 0;
			updatingText = true;
			RepeatsHorizontalUpDown.Value = 0m;
			RepeatsVerticalUpDown.Value = 0m;
			OffsetHorizontalUpDown.Value = 0m;
			OffsetVerticalUpDown.Value = 0m;
			updatingText = false;
			UpdateSelection();
			if (!AboutBox1.IsRegistered())
			{
				Text = "Texture Mapper (Unregistered)";
				timer1.Enabled = true;
			}
			else
			{
				Text = "Texture Mapper";
				timer1.Enabled = false;
			}
		}

		private void comboBox1_SelectedIndexChanged(object sender, EventArgs e)
		{
			UpdateInfo();
		}

		private void FlipHorizontalCheckBox_CheckedChanged(object sender, EventArgs e)
		{
			UpdateInfo();
		}

		private void FlipVerticalCheckBox_CheckedChanged(object sender, EventArgs e)
		{
			UpdateInfo();
		}

		private void TextBox_Enter(object sender, EventArgs e)
		{
			((TextBox)sender).Focus();
		}

		private void AboutButton_Click(object sender, EventArgs e)
		{
			using (AboutBox1 aboutBox = new AboutBox1())
			{
				aboutBox.ShowDialog(this);
			}
			if (AboutBox1.IsRegistered())
			{
				timer1.Enabled = false;
				Text = "Texture Mapper";
			}
		}

		private void RepeatsVerticalTextBox_TextChanged(object sender, EventArgs e)
		{
			if (!IsMouseDown && !updatingText)
			{
				UpdateSelection();
			}
		}

		private void OffsetHorizontalTextBox_TextChanged(object sender, EventArgs e)
		{
			if (!IsMouseDown && !updatingText)
			{
				UpdateSelection();
			}
		}

		private void OffsetVerticalTextBox_TextChanged(object sender, EventArgs e)
		{
			if (!IsMouseDown && !updatingText)
			{
				UpdateSelection();
			}
		}

		private void pictureBox1_Resize(object sender, EventArgs e)
		{
			UpdateSelection();
		}

		private void pictureBox1_SizeChanged(object sender, EventArgs e)
		{
			UpdateSelection();
		}

		private void timer1_Tick(object sender, EventArgs e)
		{
			using (AboutBox1 aboutBox = new AboutBox1())
			{
				aboutBox.ShowDialog(this);
			}
			if (AboutBox1.IsRegistered())
			{
				timer1.Enabled = false;
				Text = "Texture Mapper";
			}
			else
			{
				Application.Exit();
			}
		}

		private void pictureBox1_DoubleClick(object sender, EventArgs e)
		{
			updatingText = true;
			RepeatsHorizontalUpDown.Value = 0m;
			RepeatsVerticalUpDown.Value = 0m;
			OffsetHorizontalUpDown.Value = 0m;
			OffsetVerticalUpDown.Value = 0m;
			updatingText = false;
			UpdateSelection();
		}

		private void UI_ValueChanged(object sender, EventArgs e)
		{
			if (!IsMouseDown && !updatingText)
			{
				UpdateSelection();
			}
		}
	}
}
