package com.remotedisplay.player.net

import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.Assert.*
import org.junit.Test

class MediaAuthorizationTest {
    @Test fun privateOriginUsesHeaders() {
        val headers = MediaAuthorization.headers("https://screen.test", "fixture-id", "fixture-token", "https://screen.test/api/content/a/file?rev=1".toHttpUrl())
        assertEquals("Bearer fixture-token", headers["Authorization"])
        assertEquals("fixture-id", headers["X-ST-Device-Id"])
    }
    @Test fun foreignOriginsAndPublicPathsNeverReceiveSecrets() {
        for (url in listOf("https://evil.test/uploads/content/a", "https://screen.test.evil/uploads/content/a", "http://screen.test/uploads/content/a", "https://screen.test:9443/uploads/content/a", "https://screen.test/api/status")) {
            assertTrue(MediaAuthorization.headers("https://screen.test", "id", "token", url.toHttpUrl()).isEmpty())
        }
    }
    @Test fun unpairedDeviceDoesNotSendAnEmptyCredential() {
        assertTrue(MediaAuthorization.headers("https://screen.test", "", "", "https://screen.test/uploads/content/a".toHttpUrl()).isEmpty())
    }
}
