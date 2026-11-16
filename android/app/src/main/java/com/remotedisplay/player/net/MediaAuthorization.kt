package com.remotedisplay.player.net

import android.content.Context
import com.remotedisplay.player.data.ServerConfig
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.HttpUrl

/** Credentials stay in headers and are never forwarded to another origin. */
object MediaAuthorization {
    fun headers(serverUrl: String, deviceId: String, token: String, url: HttpUrl): Map<String, String> {
        val origin = serverUrl.toHttpUrlOrNull()
        val privatePath = url.encodedPath.startsWith("/api/content/") ||
            url.encodedPath.startsWith("/uploads/content/") || url.encodedPath.startsWith("/fonts/u/")
        val sameOrigin = origin != null && url.scheme == origin.scheme && url.host == origin.host && url.port == origin.port
        return if (privatePath && sameOrigin && deviceId.isNotEmpty() && token.isNotEmpty())
            mapOf("Authorization" to "Bearer $token", "X-ST-Device-Id" to deviceId) else emptyMap()
    }
    fun client(context: Context, base: OkHttpClient): OkHttpClient {
        val config = ServerConfig(context.applicationContext)
        return base.newBuilder().followRedirects(false).followSslRedirects(false)
            .addInterceptor { chain ->
                val request = chain.request()
                val builder = request.newBuilder()
                for ((key, value) in headers(config.serverUrl, config.deviceId, config.deviceToken, request.url)) builder.header(key, value)
                chain.proceed(builder.build())
            }.build()
    }
}
