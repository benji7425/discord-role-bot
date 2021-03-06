import { GuildMember as DjsGuildMember } from "discord.js"
import { DisharmonyClient, loadConfig, Logger } from "disharmony"
import commands from "./commands"
import { updateInviteUsesForAllGuilds, updateInviteUsesForGuild } from "./core/invite-manager"
import { Guild } from "./models/guild"
import { Message } from "./models/message"

const config = loadConfig()

const client = new DisharmonyClient(commands, config!, Message)

client.onReady.sub(() => updateInviteUsesForAllGuilds(client))
client.djs.on("guildMemberAdd", onGuildMemberAdd)

client.login(config.token).catch(async err =>
{
    await Logger.consoleLogError("Error during initialisation", err)
    process.exit(1)
})

async function onGuildMemberAdd(djsGuildMember: DjsGuildMember)
{
    const guild = new Guild(djsGuildMember.guild)
    await guild.loadDocument()

    try
    {
        const invites = await guild.djs.fetchInvites()

        for (const configuredInvite of guild.configuredInvites)
        {
            const invite = invites.get(configuredInvite.inviteId)
            if (invite && (invite.uses - configuredInvite.uses === 1))
                await djsGuildMember.addRole(configuredInvite.roleId)
        }
        await updateInviteUsesForGuild(guild)
        await guild.save()
    }
    catch (ex)
    {
        Logger.debugLogError(`Error updating invites for guild ${guild.id}`, ex)
        Logger.logEvent("ErrorUpdatingInvites")
    }
}