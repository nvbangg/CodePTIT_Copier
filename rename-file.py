import os

#! Code này để đổi tên tất cả file trong thư mục từ dạng "ID_001" sang dạng "ID001"

def get_new_name(filename):
    name, ext = os.path.splitext(filename)
    parts = name.split('_')
    if len(parts) >= 2 and parts[0].isalpha() and parts[1].isdigit():
        return parts[0] + parts[1] + '_' + '_'.join(parts[2:]) + ext if len(parts) > 2 else parts[0] + parts[1] + ext
    return None

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print("Chạy code sẽ làm mất Testcase có sẵn đi kèm theo file code bị đổi tên")
    print("Chỉ chạy nếu như chắc chắn không cần Testcase của file cũ")
    print('Xác nhận đổi tên tất cả file trong thư mục hiện tại lẫn thư mục con từ dạng "ID_001_abc" sang dạng "ID001_abc"')
    confirm = input('Để xác nhận gõ "y", nhấn bất kì phím nào khác để hủy: ')
    if confirm.lower() != 'y':
        print('Đã hủy')
        return
    
    count = 0
    for root, dirs, files in os.walk(script_dir):
        for file in files:
            new_name = get_new_name(file)
            if new_name:
                old_path = os.path.join(root, file)
                new_path = os.path.join(root, new_name)
                rel_dir = os.path.relpath(root, script_dir)
                rel_old = file if rel_dir == '.' else f'{rel_dir}\{file}'
                rel_new = new_name if rel_dir == '.' else f'{rel_dir}\{new_name}'
                try:
                    print(f'- Tìm thấy file: {rel_old}')
                    os.rename(old_path, new_path)
                    print(f'- Đã đổi tên thành: {rel_new}')
                    count += 1
                except Exception as e:
                    print(f'Lỗi khi đổi tên {rel_old}: {e}')
                    return
    
    print(f'Đã đổi tên thành công {count} file')

if __name__ == '__main__':
    main()
