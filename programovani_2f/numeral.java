package programovani_2f;

public class numeral {
    public static void main(String[] args) {
        System.out.println(toBase(28, 8));
    }

public static String toBase(long n, int base) {
    StringBuilder sb = new StringBuilder();
    while (n != 0) {
        char c = '0';
        c += n % base;
        sb.insert(0, c);
        n /= base;
    }
    return sb.toString();
    }
}
