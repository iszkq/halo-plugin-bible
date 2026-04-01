package run.halo.bible;

import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;

/**
 * 圣经插件：从内置 CSV 按卷名-章名查看、关键词搜索经文，并在编辑器中插入经文。
 */
public class BiblePlugin extends BasePlugin {

    public BiblePlugin(PluginContext pluginContext) {
        super(pluginContext);
    }

    @Override
    public void start() {
        // 插件启动
    }

    @Override
    public void stop() {
        // 插件停止
    }
}
