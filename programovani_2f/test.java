package programovani_2f;

class Convertor {

    private final char[] digits;

    public Convertor(char[] digits) {
        if (digits.length < 2) {
            throw new IllegalArgumentException();
        }
        this.digits = digits;
    }

    public String convert(int value) {
        if (value < 0) {
            return "-" + convert(-value);
        }
        StringBuilder sb = new StringBuilder();
        int base = digits.length;
        do {
            sb.append(digits[value % base]);
            value /= base;
        } while (value > 0);
        return sb.reverse().toString();
    }

    private static void test(char[] digits, int value, String check) {
        String result = new Convertor(digits).convert(value);
        System.out.println(value + "[" + String.valueOf(digits) + "] = " + result);
    }

    public static void main(String[] args) {
        test(new char[]{'0', '1'}, -8, "10100");
        test(new char[]{'0', '1', '2', '3', '4', '5', '6', '7'}, 63, "77");
        test(new char[]{'0', '1', '2', '3', '4', '5', '6', '7', '8', '9'}, 1234, "1234");
    }
}