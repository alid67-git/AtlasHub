package com.dncr.atlashub;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(HubApkPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
