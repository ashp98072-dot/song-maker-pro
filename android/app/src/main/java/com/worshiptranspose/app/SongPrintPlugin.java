package com.worshiptranspose.app;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SongPrint")
public class SongPrintPlugin extends Plugin {
    // Keep the off-screen WebView alive until the system finishes/cancels printing.
    private WebView printView;

    @PluginMethod
    public void print(PluginCall call) {
        String html = call.getString("html");
        String title = call.getString("title", "Worship Transpose");
        if (html == null || html.isEmpty()) {
            call.reject("No hay contenido para imprimir.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (printView != null) {
                call.reject("Ya hay una impresión en curso.");
                return;
            }
            PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            if (manager == null) {
                call.reject("El servicio de impresión no está disponible.");
                return;
            }
            WebView view = new WebView(getActivity());
            printView = view;
            view.getSettings().setJavaScriptEnabled(false);
            view.getSettings().setAllowFileAccess(false);
            view.getSettings().setBlockNetworkLoads(true);
            view.setWebViewClient(new WebViewClient() {
                private boolean started;

                @Override
                public void onPageFinished(WebView webView, String url) {
                    if (started) return;
                    started = true;
                    PrintDocumentAdapter delegate = webView.createPrintDocumentAdapter(title);
                    PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                        @Override
                        public void onStart() { delegate.onStart(); }

                        @Override
                        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                                CancellationSignal cancellation, LayoutResultCallback callback, Bundle extras) {
                            delegate.onLayout(oldAttributes, newAttributes, cancellation, callback, extras);
                        }

                        @Override
                        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                                CancellationSignal cancellation, WriteResultCallback callback) {
                            delegate.onWrite(pages, destination, cancellation, callback);
                        }

                        @Override
                        public void onFinish() {
                            try { delegate.onFinish(); }
                            finally { releaseView(webView); }
                        }
                    };
                    try {
                        manager.print(title, adapter, new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                        // Resolves when the chooser opens, not when a file has been saved.
                        call.resolve();
                    } catch (Exception error) {
                        releaseView(webView);
                        call.reject("No se pudo abrir la impresión de Android.", error);
                    }
                }
            });
            view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });
    }

    private void releaseView(WebView view) {
        getActivity().runOnUiThread(() -> {
            if (printView == view) {
                printView = null;
                view.destroy();
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (printView != null) releaseView(printView);
    }
}
