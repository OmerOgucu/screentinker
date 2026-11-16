package com.remotedisplay.player.net

import android.content.Context
import com.remotedisplay.player.data.ServerConfig
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient

/** Credentials stay in headers and are never forwarded to another origin. */
object MediaAuthorization {
    fun client(context: Context, base: OkHttpClient): OkHttpClient {
        val config = ServerConfig(context.applicationContext)
        return base.newBuilder().followRedirects(false).followSslRedirects(false)
            .addInterceptor { chain ->
                val request = chain.request()
                val origin = config.serverUrl.toHttpUrlOrNull()
                val url = request.url
                val privatePath = url.encodedPath.startsWith("/api/content/") ||
                    url.encodedPath.startsWith("/uploads/content/") || url.encodedPath.startsWith("/fonts/u/")
                val sameOrigin = origin != null && url.scheme == origin.scheme && url.host == origin.host && url.port == origin.port
                val id = config.deviceId
                val token = config.deviceToken
                val authorized = if (privatePath && sameOrigin && id.isNotEmpty() && token.isNotEmpty()) {
                    request.newBuilder().header("Authorization", "Bearer $token").header("X-ST-Device-Id", id).build()
                } else request
                chain.proceed(authorized)
            }.build()
    }
}
