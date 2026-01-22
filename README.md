# Thời Khóa Biểu (Timetable)

## Giới thiệu

Đây là một ứng dụng web xem thời khóa biểu đơn giản, sạch sẽ và dễ sử dụng. Giao diện được thiết kế để cung cấp một cái nhìn tổng quan và rõ ràng về lịch học trong tuần.

## Vấn đề được giải quyết

Trong môi trường học đường, việc quản lý và theo dõi lịch học hàng ngày có thể trở nên phức tạp. Thời khóa biểu giấy dễ bị mất hoặc hư hỏng, trong khi các ứng dụng phức tạp lại yêu cầu nhiều thao tác cài đặt và sử dụng.

Dự án này giải quyết vấn đề đó bằng cách cung cấp một giải pháp đơn giản: một trang web duy nhất hiển thị toàn bộ lịch học trong tuần một cách trực quan. Nó giúp sinh viên và giáo viên:

-   Nhanh chóng xem lịch học hàng ngày.
-   Dễ dàng theo dõi các môn học, giáo viên phụ trách và phòng học.
-   Tránh sự lộn xộn của các phương pháp quản lý lịch học truyền thống.

## Tính năng

-   **Hiển thị lịch học cả tuần:** Xem toàn bộ lịch học từ Thứ 2 đến Thứ 7.
-   **Giao diện rõ ràng:** Các môn học được sắp xếp gọn gàng theo ngày và buổi học (sáng/chiều).
-   **Dễ dàng tùy chỉnh:** Dữ liệu thời khóa biểu được quản lý trong một file `Lich_Hoc.json` duy nhất, giúp người dùng dễ dàng cập nhật lịch trình của riêng mình mà không cần thay đổi mã nguồn.
-   **Không cần cài đặt:** Chỉ cần mở file `index.html` trên trình duyệt là có thể sử dụng ngay.

## Hướng dẫn sử dụng

1.  Mở file `index.html` trong một trình duyệt web hiện đại (ví dụ: Chrome, Firefox, Edge).
2.  Thời khóa biểu của bạn sẽ được hiển thị ngay lập tức.

## Hướng dẫn tùy chỉnh lịch học

Bạn có thể dễ dàng thay đổi lịch học cho phù hợp với nhuKk cầu của mình.

1.  Mở file `Lich_Hoc.json`.
2.  File này chứa một danh sách (mảng) các buổi học. Mỗi buổi học là một đối tượng (object) với các thuộc tính sau:
    -   `ngay`: Ngày trong tuần (ví dụ: "Thứ 2").
    -   `buoi`: Buổi học (ví dụ: "Sáng", "Chiều").
    -   `monHoc`: Tên môn học (ví dụ: "Toán").
    -   `giaoVien`: Tên giáo viên (ví dụ: "Nguyễn Văn A").
    -   `phongHoc`: Tên phòng học (ví dụ: "P.101").
3.  **Chỉnh sửa, thêm hoặc xóa** các đối tượng trong danh sách để cập nhật lịch học của bạn.
4.  Lưu lại file `Lich_Hoc.json`.
5.  Tải lại trang `index.html` để xem các thay đổi.

## Công nghệ sử dụng

-   HTML5
-   CSS3
-   JavaScript (Vanilla)