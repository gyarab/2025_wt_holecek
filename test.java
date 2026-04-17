import java.util.Arrays;

class Fibonacci {

    public static void fill(int[] series) {
        if (series.length > 0) {
            series[0] = 0;
        }
        if (series.length > 1) {
            series[1] = 1;
        }
        for (int i = 2; i < series.length; i++) {
            series[i] = series[i - 1] + series[i - 2];
        }
    }

    public static void main(String[] args) {
        int[] fib5 = new int[5];
        int[] fib10 = new int[10];
        fill(fib5);
        fill(fib10);
        System.out.println(Arrays.toString(fib5));
        System.out.println(Arrays.toString(fib10));
    }
}