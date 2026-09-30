package ru.derzhava.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.lang.ref.WeakReference;

/**
 * Вся игра живёт в assets/index.html. Активити показывает её и даёт мост DZAndroid:
 * вибрацию, версию приложения и обновления с GitHub. Партии и настройки лежат в localStorage.
 */
public class MainActivity extends Activity {
    static WeakReference<MainActivity> current = new WeakReference<>(null);

    private WebView web;
    private Vibrator vibrator;
    private Updater updater;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = new WeakReference<>(this);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        updater = new Updater(this);

        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#0E1420"));
        w.setNavigationBarColor(Color.parseColor("#0E1420"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0E1420"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setTextZoom(100);   // системный размер шрифта не должен ломать вёрстку

        web.addJavascriptInterface(new Bridge(), "DZAndroid");
        web.setWebViewClient(new WebViewClient());
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    /** Кнопку «Назад» сначала обрабатывает игра: закрывает окно или экран. */
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.dzBack ? dzBack() : false", result -> {
            if (!"true".equals(result)) finish();
        });
    }

    @Override
    protected void onPause() {
        web.evaluateJavascript("window.dzSave && window.dzSave()", null);
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    void js(String code) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(code, null); });
    }

    String versionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "?";
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void vibrate(int ms) {
            if (vibrator == null || !vibrator.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
        }

        @JavascriptInterface
        public String appVersion() { return versionName(); }

        @JavascriptInterface
        public void checkUpdate(boolean manual) { updater.check(manual); }

        @JavascriptInterface
        public void startUpdate() { updater.download(); }
    }
}
