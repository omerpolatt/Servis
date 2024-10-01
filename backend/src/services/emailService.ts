import nodemailer from 'nodemailer';

// Nodemailer yapılandırması
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Gmail kullanıyorsanız
  auth: {
    user: 'avsromerfp@gmail.com',  // Kendi Gmail adresiniz
    pass: 'yviy rigs aybo wtbd'    // Gmail uygulama şifreniz (normal şifre değil, uygulama şifresi)
  }
});

// E-posta gönderme fonksiyonu
export const sendVerificationCode = async (email: string) => {
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();  // 6 haneli rastgele kod

  const mailOptions = {
    from: 'avsromerfp@gmail.com',  // Gönderici adresi
    to: email,                     // Alıcı (kullanıcının e-posta adresi)
    subject: 'Doğrulama Kodu',
    text: `Kayıt işlemi için doğrulama kodunuz: ${verificationCode}`  // Doğrulama kodu e-postada gösterilecek
  };

  try {
    await transporter.sendMail(mailOptions);
    return verificationCode;  // Kod geri döndürülür, böylece saklanabilir
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
    console.error()
    throw new Error('Doğrulama kodu gönderilemedi.');
  }
};
