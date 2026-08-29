import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { PlusCircle } from 'lucide-react';
import { PREVIEW_SYNTHS } from '../fixtures';

export function DialogStory() {
  return (
    <div className="w-full min-w-0 max-w-md rounded-lg border bg-background p-6 shadow-lg">
      <div className="flex flex-col space-y-1.5 text-left">
        <h3 className="text-lg font-semibold leading-none tracking-tight">Rename chat</h3>
        <p className="text-sm text-muted-foreground">Give this thread a name the room will remember.</p>
      </div>
      <Input className="mt-4" defaultValue="Launch review" />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </div>
    </div>
  );
}

export function DialogLive() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Open live dialog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
          <DialogDescription>Give this thread a name the room will remember.</DialogDescription>
        </DialogHeader>
        <Input defaultValue="Launch review" />
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AlertDialogStory() {
  return (
    <div className="w-full min-w-0 max-w-md rounded-lg border bg-background p-6 shadow-lg">
      <div className="flex flex-col space-y-2 text-left">
        <h3 className="text-lg font-semibold">Delete chat?</h3>
        <p className="text-sm text-muted-foreground">
          This removes Launch review and its messages. Synths stay in your catalog.
        </p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Delete</Button>
      </div>
    </div>
  );
}

export function AlertDialogLive() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Open live confirm
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete chat?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes Launch review and its messages. Synths stay in your catalog.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PopoverStory() {
  return (
    <div className="w-full min-w-0 max-w-sm rounded-md border bg-popover p-4 text-popover-foreground shadow-md">
      <p className="text-xs font-medium text-neutral-700">Change model for Anya Voss</p>
      <p className="mt-1 text-sm text-neutral-500">Gemini 3.7 Flash is the default for this room.</p>
    </div>
  );
}

export function PopoverLive() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Open live popover
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <p className="text-xs font-medium text-neutral-700">Change model for Anya Voss</p>
        <p className="mt-1 text-sm text-neutral-500">Gemini 3.7 Flash is the default for this room.</p>
      </PopoverContent>
    </Popover>
  );
}

export function CommandStory() {
  return (
    <Command className="h-auto w-full max-w-sm overflow-visible rounded-lg border shadow-md">
      <CommandInput placeholder="Mention a synth..." />
      <CommandList className="max-h-none overflow-visible">
        <CommandEmpty>No synths.</CommandEmpty>
        <CommandGroup heading="Members">
          {PREVIEW_SYNTHS.map((synth) => (
            <CommandItem key={synth.id} value={synth.name} onSelect={() => {}}>
              <PersonAvatar name={synth.name} src={synth.profileImage} className="mr-2 h-6 w-6 shrink-0" />
              <span className="min-w-0 truncate">{synth.name}</span>
              <span className="ml-auto shrink-0 text-xs text-neutral-400">{synth.role}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function TooltipStory() {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400">
        <PlusCircle className="h-3.5 w-3.5" />
      </Button>
      <div className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">Add to chat</div>
    </div>
  );
}

export function TooltipLive() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm">
          Hover live tooltip
        </Button>
      </TooltipTrigger>
      <TooltipContent>Add to chat</TooltipContent>
    </Tooltip>
  );
}
