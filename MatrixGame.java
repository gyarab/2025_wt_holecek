import javax.swing.*;
import java.awt.*;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;

/**
 * Program implementuje matici 5x5 editovatelných polí s dynamickou změnou
 * barvy pozadí na základě stavu a reakcí na klávesy Enter (transpozice) a Esc
 * (reset).
 */
public class MatrixGame extends JFrame {

    private static final int MATRIX_SIZE = 5;
    private final JTextField[][] fields = new JTextField[MATRIX_SIZE][MATRIX_SIZE];

    // Barvy pro pozadí
    private static final Color COLOR_DEFAULT = Color.WHITE;
    private static final Color COLOR_FOCUS = Color.YELLOW;
    private static final Color COLOR_FILLED = Color.DARK_GRAY;

    public MatrixGame() {
        // Nastavení základních vlastností okna
        setTitle("Matice 5x5 Editovatelných Polí");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        // Použití GridLayout pro matici, zajistí adaptivní velikost polí
        setLayout(new GridLayout(MATRIX_SIZE, MATRIX_SIZE));

        // Vytvoření a inicializace polí
        initializeFields();

        // Nastavení okna
        setPreferredSize(new Dimension(600, 600)); // Doporučená počáteční velikost
        pack();
        setLocationRelativeTo(null); // Centrování okna na obrazovce
    }

    /**
     * Vytvoří a přidá 25 JTextFieldů do matice a nastaví jim Listenery.
     */
    private void initializeFields() {
        // Vytvoření a konfigurace jednotlivých polí
        for (int i = 0; i < MATRIX_SIZE; i++) {
            for (int j = 0; j < MATRIX_SIZE; j++) {
                JTextField field = new JTextField();
                field.setHorizontalAlignment(JTextField.CENTER); // Vycentrování textu
                field.setBackground(COLOR_DEFAULT); // Nastavení výchozí bílé barvy

                // Přidání FocusListeneru pro změnu barvy při focusu/blur
                field.addFocusListener(new FieldFocusListener());

                // Přidání KeyListeneru pro reakci na Enter a Esc
                field.addKeyListener(new MatrixKeyListener());

                fields[i][j] = field;
                add(field);
            }
        }
    }

    /**
     * Vnitřní třída pro zpracování událostí Focusu (získání/ztráta ohniska).
     */
    private class FieldFocusListener implements FocusListener {
        @Override
        public void focusGained(FocusEvent e) {
            // Pole získalo ohnisko: nastaví žlutou barvu pozadí
            JTextField field = (JTextField) e.getComponent();
            field.setBackground(COLOR_FOCUS);
        }

        @Override
        public void focusLost(FocusEvent e) {
            // Pole ztratilo ohnisko: provede kontrolu a případnou změnu stavu
            JTextField field = (JTextField) e.getComponent();
            String text = field.getText().trim();

            if (text.isEmpty()) {
                // Pole je prázdné: nastaví zpět bílou barvu
                field.setBackground(COLOR_DEFAULT);
            } else {
                // Pole je naplněné: nastaví tmavě šedou barvu a zakáže editaci
                field.setBackground(COLOR_FILLED);
                field.setEnabled(false); // Zakáže pole
            }
        }
    }

    /**
     * Vnitřní třída pro zpracování klávesových událostí (Enter a Esc).
     */
    private class MatrixKeyListener implements KeyListener {
        @Override
        public void keyTyped(KeyEvent e) {
            // Nepoužívá se
        }

        @Override
        public void keyPressed(KeyEvent e) {
            if (e.getKeyCode() == KeyEvent.VK_ENTER) {
                // Po stisku Enter: provedeme transpozici matice
                transposeMatrix();
            } else if (e.getKeyCode() == KeyEvent.VK_ESCAPE) {
                // Po stisku Esc: resetujeme matici do výchozího stavu
                resetMatrix();
            }
        }

        @Override
        public void keyReleased(KeyEvent e) {
            // Nepoužívá se
        }
    }

    /**
     * Provede transpozici hodnot v matici (prohodí pole [i][j] s [j][i]).
     */
    private void transposeMatrix() {
        // Transpozice provádíme jen pro horní trojúhelník (j > i), aby se neprohodily
        // dvakrát
        for (int i = 0; i < MATRIX_SIZE; i++) {
            for (int j = i + 1; j < MATRIX_SIZE; j++) {
                // Prohodí text
                String temp = fields[i][j].getText();
                fields[i][j].setText(fields[j][i].getText());
                fields[j][i].setText(temp);

                // Prohodí stav (Enabled)
                boolean tempEnabled = fields[i][j].isEnabled();
                fields[i][j].setEnabled(fields[j][i].isEnabled());
                fields[j][i].setEnabled(tempEnabled);

                // Prohodí barvu pozadí
                Color tempColor = fields[i][j].getBackground();
                fields[i][j].setBackground(fields[j][i].getBackground());
                fields[j][i].setBackground(tempColor);
            }
        }
        System.out.println("Matice byla transponována.");
    }

    /**
     * Uvede všechna pole matice do výchozího stavu (povoleno, bílé pozadí).
     */
    private void resetMatrix() {
        for (int i = 0; i < MATRIX_SIZE; i++) {
            for (int j = 0; j < MATRIX_SIZE; j++) {
                JTextField field = fields[i][j];
                field.setText(""); // Vymaže text
                field.setEnabled(true); // Povolí pole
                field.setBackground(COLOR_DEFAULT); // Nastaví bílé pozadí
            }
        }

        // Zpracování aktivně editovaného pole, kde bylo stisknuto Esc:
        // Musíme najít pole, které má focus a nastavit mu žlutou barvu
        Component focusedComponent = KeyboardFocusManager.getCurrentKeyboardFocusManager().getFocusOwner();
        if (focusedComponent instanceof JTextField) {
            focusedComponent.setBackground(COLOR_FOCUS);
        }

        System.out.println("Matice byla resetována.");
    }

    /**
     * Hlavní metoda pro spuštění aplikace.
     */
    public static void main(String[] args) {
        // Spuštění grafické aplikace v EDT (Event Dispatch Thread)
        SwingUtilities.invokeLater(() -> {
            MatrixGame game = new MatrixGame();
            game.setVisible(true);
        });
    }
}