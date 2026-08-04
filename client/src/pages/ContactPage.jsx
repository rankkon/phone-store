export default function ContactPage() {
  return (
    <section className="info-page">
      <p className="eyebrow">HỖ TRỢ KHÁCH HÀNG</p><h1>Liên hệ với Phone Store</h1><p className="info-page__intro">Chúng tôi sẵn sàng hỗ trợ thông tin sản phẩm, đơn hàng, voucher và thanh toán.</p>
      <div className="contact-grid">
        <article className="panel"><h2>Email</h2><p><a href="mailto:support@phonestore.local">support@phonestore.local</a></p><small>Phản hồi trong giờ làm việc.</small></article>
        <article className="panel"><h2>Hotline</h2><p><a href="tel:0900000000">0900 000 000</a></p><small>08:00 – 21:00, mỗi ngày.</small></article>
        <article className="panel"><h2>Địa chỉ</h2><p>TP. Hồ Chí Minh, Việt Nam</p><small>Địa chỉ phục vụ mục đích demo dự án.</small></article>
      </div>
    </section>
  );
}
